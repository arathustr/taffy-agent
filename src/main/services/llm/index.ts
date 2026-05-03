import type { RuntimeConfig } from '../../../shared/contracts';
import { getDeepSeekApiKey } from '../../env';
import { DeepSeekProvider } from './deepseekProvider';
import { MockProvider } from './mockProvider';
import type { LlmProvider } from './types';

export function createLlmProvider(config: RuntimeConfig): LlmProvider {
  const key = getDeepSeekApiKey();
  if (config.llm.useMock || !key) {
    return new MockProvider();
  }

  return new DeepSeekProvider({
    apiKey: key,
    baseUrl: config.llm.baseUrl,
    defaultModel: config.llm.defaultModel,
    timeoutMs: config.llm.timeoutMs
  });
}

