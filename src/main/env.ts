import path from 'node:path';
import dotenv from 'dotenv';
import type { RuntimeConfig } from '../shared/contracts';

const projectRoot = process.env.TAFFY_PROJECT_ROOT ?? process.cwd();

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export function getProjectRoot(): string {
  return process.cwd();
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
      enabled: false,
      provider: 'taffy-bert-vits2',
      endpoint: process.env.TAFFY_TTS_ENDPOINT || 'https://xzjosh-taffy1-2-bert-vits2.ms.show',
      volume: Number(process.env.TAFFY_TTS_VOLUME || 0.78)
    }
  };
}

export function getDeepSeekApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY;
}
