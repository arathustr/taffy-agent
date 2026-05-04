import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import type { RuntimeConfig } from '../shared/contracts';

const envCandidates = [
  process.env.TAFFY_ENV_PATH,
  path.resolve(process.cwd(), '.env'),
  process.execPath ? path.resolve(path.dirname(process.execPath), '.env') : undefined
].filter((candidate): candidate is string => Boolean(candidate));

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const projectRoot = process.env.TAFFY_PROJECT_ROOT ?? process.cwd();

export function getProjectRoot(): string {
  return projectRoot;
}

export function loadRuntimeConfig(): RuntimeConfig {
  const hasDeepSeekKey = Boolean(process.env.DEEPSEEK_API_KEY);
  const useMock =
    process.env.TAFFY_USE_MOCK_LLM === 'true' ||
    process.env.TAFFY_USE_MOCK_LLM === '1' ||
    !hasDeepSeekKey;

  return {
    llm: {
      provider: useMock ? 'mock' : 'deepseek',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      defaultModel: process.env.TAFFY_DEFAULT_MODEL || 'deepseek-v4-flash',
      advancedModel: process.env.TAFFY_ADVANCED_MODEL || 'deepseek-v4-pro',
      timeoutMs: Number(process.env.TAFFY_LLM_TIMEOUT_MS || 120000),
      useMock
    },
    ui: {
      alwaysOnTop: true,
      petScale: 1,
      compactMode: false
    },
    permissions: {
      allowShell: false,
      allowBrowser: true,
      allowCodex: true,
      trustedWorkspaces: [projectRoot]
    },
    voice: {
      enabled: process.env.TAFFY_TTS_ENABLED === 'true' || process.env.TAFFY_TTS_ENABLED === '1',
      provider: (process.env.TAFFY_TTS_PROVIDER as RuntimeConfig['voice']['provider']) || 'gpt-sovits',
      endpoint: process.env.TAFFY_TTS_ENDPOINT || 'http://127.0.0.1:9880/tts',
      volume: Number(process.env.TAFFY_TTS_VOLUME || 0.78),
      realtime: process.env.TAFFY_TTS_REALTIME !== 'false',
      chunkChars: Number(process.env.TAFFY_TTS_CHUNK_CHARS || 52),
      cache: process.env.TAFFY_TTS_CACHE !== 'false',
      textLanguage: process.env.TAFFY_TTS_TEXT_LANG || 'zh',
      promptLanguage: process.env.TAFFY_TTS_PROMPT_LANG || 'zh',
      referenceAudio: process.env.TAFFY_TTS_REF_AUDIO || '',
      promptText: process.env.TAFFY_TTS_PROMPT_TEXT || '',
      speed: Number(process.env.TAFFY_TTS_SPEED || 1)
    }
  };
}

export function getDeepSeekApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY;
}
