import type { RuntimeConfig } from '../shared/contracts';

type VoiceConfig = RuntimeConfig['voice'];

let currentAudio: HTMLAudioElement | undefined;
const DEFAULT_TAFFY_BERT_VITS2_ENDPOINT = 'https://xzjosh-taffy1-2-bert-vits2.ms.show';

export async function speakTaffyLine(text: string, config: VoiceConfig): Promise<void> {
  stopTaffyVoice();
  if (!config.enabled || config.provider === 'none') return;

  const line = normalizeSpeechText(text);
  if (!line) return;

  if (config.provider === 'taffy-bert-vits2' && config.endpoint.trim()) {
    try {
      await speakFromTaffyBertVits(line, config);
    } catch {
      // Do not fall back to a generic voice when the user selected Taffy voice.
    }
    return;
  }

  if (config.provider !== 'system' && config.endpoint.trim()) {
    try {
      await speakFromEndpoint(line, config);
    } catch {
      // Do not play the wrong voice when a character TTS endpoint is unavailable.
    }
    return;
  }

  if (config.provider === 'system') {
    speakWithSystemVoice(line, config);
  }
}

export function stopTaffyVoice(): void {
  currentAudio?.pause();
  currentAudio = undefined;
  window.speechSynthesis?.cancel();
}

async function speakFromTaffyBertVits(text: string, config: VoiceConfig): Promise<void> {
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

  await playAudioUrl(audioUrl, config.volume);
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

async function speakFromEndpoint(text: string, config: VoiceConfig): Promise<void> {
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

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.startsWith('audio/')) {
    await playAudioUrl(URL.createObjectURL(await response.blob()), config.volume);
    return;
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

  await playAudioUrl(audioUrl.startsWith('data:') || audioUrl.startsWith('http') ? audioUrl : `data:audio/wav;base64,${audioUrl}`, config.volume);
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

async function playAudioUrl(url: string, volume: number): Promise<void> {
  const audio = new Audio(url);
  currentAudio = audio;
  audio.volume = clampVolume(volume);
  await audio.play();
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
  return normalized.slice(0, 360);
}

function clampVolume(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.78;
  return Math.min(1, Math.max(0, value));
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
