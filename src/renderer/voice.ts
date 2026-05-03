import type { RuntimeConfig } from '../shared/contracts';

type VoiceConfig = RuntimeConfig['voice'];

let currentAudio: HTMLAudioElement | undefined;
let voiceSessionId = 0;
const DEFAULT_TAFFY_BERT_VITS2_ENDPOINT = 'https://xzjosh-taffy1-2-bert-vits2.ms.show';
const MAX_AUDIO_CACHE_ITEMS = 80;
const audioCache = new Map<string, string>();

export async function speakTaffyLine(text: string, config: VoiceConfig): Promise<void> {
  stopTaffyVoice();
  if (!config.enabled || config.provider === 'none') return;

  const line = normalizeSpeechText(text);
  if (!line) return;

  const sessionId = ++voiceSessionId;

  if (config.provider === 'system') {
    speakWithSystemVoice(line, config);
    return;
  }

  try {
    await speakWithLocalQueue(line, config, sessionId);
  } catch {
    // Do not play the wrong voice when a character TTS endpoint is unavailable.
  }
}

export function stopTaffyVoice(): void {
  voiceSessionId += 1;
  currentAudio?.pause();
  currentAudio = undefined;
  window.speechSynthesis?.cancel();
}

async function speakWithLocalQueue(text: string, config: VoiceConfig, sessionId: number): Promise<void> {
  const chunks = config.realtime === false ? [text] : splitSpeechChunks(text, config.chunkChars);
  if (!chunks.length) return;

  let pendingAudio = synthesizeAudio(chunks[0], config);
  for (let index = 0; index < chunks.length; index += 1) {
    const audioUrl = await pendingAudio;
    if (sessionId !== voiceSessionId) return;
    pendingAudio = chunks[index + 1] ? synthesizeAudio(chunks[index + 1], config) : Promise.resolve('');
    await playAudioUrl(audioUrl, config.volume, sessionId);
  }
}

async function synthesizeAudio(text: string, config: VoiceConfig): Promise<string> {
  const cacheKey = buildAudioCacheKey(text, config);
  if (config.cache !== false && audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey) ?? '';
  }

  let audioUrl: string;
  if (config.provider === 'taffy-bert-vits2' && config.endpoint.trim()) {
    audioUrl = await fetchTaffyBertVitsAudioUrl(text, config);
  } else if (config.provider === 'gpt-sovits' && config.endpoint.trim()) {
    audioUrl = await fetchGptSoVitsAudioUrl(text, config);
  } else {
    audioUrl = await fetchEndpointAudioUrl(text, config);
  }

  if (config.cache !== false) {
    audioCache.set(cacheKey, audioUrl);
    while (audioCache.size > MAX_AUDIO_CACHE_ITEMS) {
      const oldestKey = audioCache.keys().next().value;
      if (!oldestKey) break;
      audioCache.delete(oldestKey);
    }
  }
  return audioUrl;
}

async function fetchTaffyBertVitsAudioUrl(text: string, config: VoiceConfig): Promise<string> {
  const baseUrl = resolveTaffyEndpoint(config.endpoint);
  const endpointInfo = await resolveGradioEndpointInfo(baseUrl);
  const speaker = resolveTaffySpeaker(endpointInfo);
  const payload = {
    data: buildTaffyBertVitsPayload(text, speaker, endpointInfo.parameters),
    fn_index: endpointInfo.fnIndex
  };

  const response = await postGradio(baseUrl, payload);
  const result = (await response.json()) as { data?: unknown[]; error?: string };
  if (result.error) {
    throw new Error(result.error);
  }

  const audioOutput = result.data?.[1];
  const audioUrl = resolveGradioAudioUrl(baseUrl, audioOutput);
  if (!audioUrl) {
    throw new Error('Taffy Bert-VITS2 did not return audio');
  }

  return audioUrl;
}

interface GradioEndpointInfo {
  fnIndex: number | string;
  parameters: Array<{ label?: string; parameter_name?: string }>;
  speakers: string[];
}

async function resolveGradioEndpointInfo(baseUrl: string): Promise<GradioEndpointInfo> {
  try {
    const response = await fetch(`${baseUrl}/info`);
    if (response.ok) {
      const info = (await response.json()) as {
        unnamed_endpoints?: Record<string, { parameters?: Array<{ label?: string; parameter_name?: string; type?: { description?: string } }> }>;
        named_endpoints?: Record<string, { parameters?: Array<{ label?: string; parameter_name?: string; type?: { description?: string } }> }>;
      };
      const endpointKey = Object.keys(info.unnamed_endpoints ?? {})[0] ?? Object.keys(info.named_endpoints ?? {})[0] ?? '0';
      const endpoint = (info.unnamed_endpoints ?? {})[endpointKey] ?? (info.named_endpoints ?? {})[endpointKey];
      const parameters = endpoint?.parameters ?? [];
      return {
        fnIndex: Number.isNaN(Number(endpointKey)) ? endpointKey : Number(endpointKey),
        parameters,
        speakers: extractSpeakersFromParameters(parameters)
      };
    }
  } catch {
    // Try /config below.
  }

  const response = await fetch(`${baseUrl}/config`);
  if (!response.ok) {
    return fallbackGradioEndpointInfo();
  }

  const config = (await response.json()) as {
    dependencies?: Array<{ targets?: number[]; inputs?: number[]; outputs?: number[] }>;
    components?: Array<{
      id?: number;
      props?: {
        label?: string;
        choices?: Array<string | [string, string]>;
      };
    }>;
  };
  const dependency = config.dependencies?.find((item) => item.outputs?.length) ?? config.dependencies?.[0];
  const inputIds = dependency?.inputs ?? [];
  const componentsById = new Map((config.components ?? []).map((component) => [component.id, component]));
  const parameters = inputIds
    .map((id) => componentsById.get(id)?.props?.label)
    .filter((label): label is string => Boolean(label))
    .map((label) => ({ label }));
  const speakerComponent = inputIds.map((id) => componentsById.get(id)).find((component) => /speaker|说话人/i.test(component?.props?.label ?? ''));
  const speakers =
    speakerComponent?.props?.choices?.map((choice) => (Array.isArray(choice) ? choice[1] : choice)).filter(Boolean) ?? [];

  return {
    fnIndex: dependency?.targets?.[0] ?? 0,
    parameters: parameters.length ? parameters : fallbackGradioEndpointInfo().parameters,
    speakers: speakers.length ? speakers : ['taffy']
  };
}

function resolveTaffySpeaker(endpointInfo: GradioEndpointInfo): string {
  return endpointInfo.speakers.find((choice) => /塔菲|永雏|taffy/i.test(choice)) ?? endpointInfo.speakers[0] ?? 'taffy';
}

function buildTaffyBertVitsPayload(
  text: string,
  speaker: string,
  parameters: GradioEndpointInfo['parameters']
): Array<string | number | null> {
  return parameters.map((parameter) => {
    const key = `${parameter.parameter_name ?? ''} ${parameter.label ?? ''}`.toLowerCase();
    if (key.includes('text') || key.includes('文本')) return text;
    if (key.includes('speaker') || key.includes('说话人')) return speaker;
    if (key.includes('sdp') || key.includes('dp混合')) return 0.3;
    if (key.includes('noise_w') || key.includes('音素长度')) return 0.8;
    if (key.includes('noise') || key.includes('感情')) return 0.4;
    if (key.includes('length') || key.includes('生成长度') || key.includes('语速')) return 1;
    if (key.includes('language') || key.includes('语言')) return 'ZH';
    if (key.includes('reference') || key.includes('audio prompt')) return null;
    if (key.includes('emotion')) return 'Happy';
    if (key.includes('prompt mode')) return 'Text prompt';
    if (key.includes('text prompt')) return 'Happy';
    if (key.includes('style text') || key.includes('辅助文本')) return '';
    if (key.includes('style_weight') || key.includes('weight')) return 0.7;
    return '';
  });
}

function extractSpeakersFromParameters(
  parameters: Array<{ label?: string; parameter_name?: string; type?: { description?: string } }>
): string[] {
  const speakerParameter = parameters.find((parameter) => {
    const key = `${parameter.parameter_name ?? ''} ${parameter.label ?? ''}`;
    return /speaker|说话人/i.test(key);
  });
  const description = speakerParameter?.type?.description ?? '';
  return Array.from(description.matchAll(/'([^']+)'/g), (match) => match[1]).filter(Boolean);
}

function fallbackGradioEndpointInfo(): GradioEndpointInfo {
  return {
    fnIndex: 0,
    parameters: [
      { label: 'Text' },
      { label: 'Speaker' },
      { label: 'SDP/DP混合比' },
      { label: '感情调节' },
      { label: '音素长度' },
      { label: '生成长度' }
    ],
    speakers: ['taffy']
  };
}

function resolveTaffyEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/$/, '');
  if (!trimmed) return DEFAULT_TAFFY_BERT_VITS2_ENDPOINT;
  if (/xzjosh-taffy.*hf\.space/i.test(trimmed)) {
    return DEFAULT_TAFFY_BERT_VITS2_ENDPOINT;
  }
  return trimmed;
}

async function postGradio(baseUrl: string, payload: Record<string, unknown>): Promise<Response> {
  for (const path of ['/run/predict', '/api/predict']) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) return response;
  }

  throw new Error('Taffy Bert-VITS2 endpoint is unavailable');
}

async function fetchGptSoVitsAudioUrl(text: string, config: VoiceConfig): Promise<string> {
  const body = {
    text,
    text_lang: config.textLanguage || 'zh',
    ref_audio_path: config.referenceAudio || '',
    prompt_text: config.promptText || '',
    prompt_lang: config.promptLanguage || 'zh',
    text_split_method: 'cut0',
    batch_size: 1,
    fragment_interval: 0.12,
    min_chunk_length: 8,
    media_type: 'wav',
    streaming_mode: config.realtime !== false,
    speed_factor: sanitizeSpeed(config.speed),
    top_k: 5,
    top_p: 1,
    temperature: 1
  };

  const postResponse = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (postResponse.ok) return resolveTtsResponse(postResponse);

  const url = new URL(config.endpoint);
  Object.entries(body).forEach(([key, value]) => {
    if (value !== '') url.searchParams.set(key, String(value));
  });
  const getResponse = await fetch(url);
  if (getResponse.ok) return resolveTtsResponse(getResponse);

  throw new Error(`GPT-SoVITS HTTP ${postResponse.status}/${getResponse.status}`);
}

async function fetchEndpointAudioUrl(text: string, config: VoiceConfig): Promise<string> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      text_lang: 'zh',
      prompt_lang: 'zh',
      media_type: 'wav',
      streaming_mode: false
    })
  });

  if (!response.ok) {
    throw new Error(`TTS HTTP ${response.status}`);
  }

  return resolveTtsResponse(response);
}

async function resolveTtsResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.startsWith('audio/')) {
    return URL.createObjectURL(await response.blob());
  }

  const payload = (await response.json()) as {
    audio?: string;
    audioUrl?: string;
    audio_url?: string;
    url?: string;
  };
  const audioUrl = payload.audioUrl ?? payload.audio_url ?? payload.url ?? payload.audio;
  if (!audioUrl) {
    throw new Error('TTS endpoint did not return audio');
  }

  return audioUrl.startsWith('data:') || audioUrl.startsWith('http') ? audioUrl : `data:audio/wav;base64,${audioUrl}`;
}

function resolveGradioAudioUrl(baseUrl: string, audioOutput: unknown): string | undefined {
  if (typeof audioOutput === 'string') {
    return normalizeAudioUrl(baseUrl, audioOutput);
  }

  if (Array.isArray(audioOutput) && typeof audioOutput[0] === 'number' && Array.isArray(audioOutput[1])) {
    return URL.createObjectURL(samplesToWavBlob(audioOutput[0], audioOutput[1]));
  }

  if (!audioOutput || typeof audioOutput !== 'object') {
    return undefined;
  }

  const output = audioOutput as {
    data?: string;
    name?: string;
    path?: string;
    url?: string;
    orig_name?: string;
  };

  return normalizeAudioUrl(baseUrl, output.url ?? output.data ?? output.name ?? output.path ?? output.orig_name);
}

function normalizeAudioUrl(baseUrl: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http')) return value;
  if (/^[A-Za-z0-9+/]+=*$/.test(value.slice(0, 80)) && value.length > 160) {
    return `data:audio/wav;base64,${value}`;
  }
  if (value.startsWith('/file=')) return `${baseUrl}${value}`;
  if (value.startsWith('file=')) return `${baseUrl}/${value}`;
  return `${baseUrl}/file=${encodeURIComponent(value)}`;
}

async function playAudioUrl(url: string, volume: number, sessionId: number): Promise<void> {
  if (!url || sessionId !== voiceSessionId) return;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.volume = clampVolume(volume);
  await audio.play();
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.onpause = () => {
      if (sessionId !== voiceSessionId) resolve();
    };
  });
}

function speakWithSystemVoice(text: string, config: VoiceConfig): void {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.volume = clampVolume(config.volume);
  utterance.rate = 1.06;
  utterance.pitch = 1.18;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) => /xiaoxiao|xiaoyi|yaoyao|huihui|hanhan|zh|chinese/i.test(voice.name));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function normalizeSpeechText(text: string): string {
  let normalized = text
    .replace(/```[\s\S]*?```/g, '代码片段我放在面板里了。')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '链接')
    .replace(/（[^（）]{1,48}）/g, '')
    .replace(/\([^()]{1,48}\)/g, '')
    .replace(/【[^【】]{1,48}】/g, '')
    .replace(/\[[^[\]]{1,48}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  normalized = normalized.replace(/^[：:，,。！？!?\s]+/, '').trim();
  return normalized.slice(0, 420);
}

export function splitSpeechChunks(text: string, preferredChars = 52): string[] {
  const maxChars = Math.min(120, Math.max(24, Math.round(preferredChars || 52)));
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const pieces = normalized
    .split(/(?<=[。！？!?；;，,、])\s*/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces.length ? pieces : [normalized]) {
    if (!current) {
      current = piece;
      continue;
    }
    if (/[。！？!?；;]$/.test(current)) {
      chunks.push(current);
      current = piece;
      continue;
    }
    if ((current + piece).length <= maxChars) {
      current += piece;
      continue;
    }
    chunks.push(current);
    current = piece;
  }
  if (current) chunks.push(current);

  return chunks.flatMap((chunk) => splitLongChunk(chunk, maxChars));
}

function splitLongChunk(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += maxChars) {
    chunks.push(text.slice(index, index + maxChars));
  }
  return chunks;
}

function buildAudioCacheKey(text: string, config: VoiceConfig): string {
  return [
    config.provider,
    config.endpoint,
    config.textLanguage,
    config.promptLanguage,
    config.referenceAudio,
    config.promptText,
    sanitizeSpeed(config.speed),
    text
  ].join('|');
}

function clampVolume(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.78;
  return Math.min(1, Math.max(0, value));
}

function sanitizeSpeed(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 1;
  return Math.min(2, Math.max(0.5, value));
}

function samplesToWavBlob(sampleRate: number, samples: unknown[]): Blob {
  const channels = 1;
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < samples.length; index += 1) {
    const rawValue = Number(samples[index]);
    const value = Number.isFinite(rawValue) ? rawValue : 0;
    const normalized = Math.abs(value) > 1 ? value / 32768 : value;
    const sample = Math.max(-1, Math.min(1, normalized));
    view.setInt16(44 + index * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}
