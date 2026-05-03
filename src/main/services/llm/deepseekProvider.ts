import type { ChatRequest, ChatResponse, LlmProvider } from './types';

interface DeepSeekOptions {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
}

interface DeepSeekChoice {
  message?: {
    content?: string;
    reasoning_content?: string;
  };
}

interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  error?: {
    message?: string;
    type?: string;
  };
}

export class DeepSeekProvider implements LlmProvider {
  id = 'deepseek';

  constructor(private readonly options: DeepSeekOptions) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: request.model ?? this.options.defaultModel,
          messages: request.messages,
          temperature: request.temperature ?? 0.5,
          max_tokens: request.maxTokens ?? 1200,
          response_format: request.json ? { type: 'json_object' } : undefined
        })
      });

      const payload = (await response.json()) as DeepSeekResponse;
      if (!response.ok) {
        throw new Error(payload.error?.message || `DeepSeek HTTP ${response.status}`);
      }

      const message = payload.choices?.[0]?.message;
      const content = message?.content || message?.reasoning_content;
      if (!content) {
        throw new Error('DeepSeek returned an empty response');
      }

      return {
        content,
        model: request.model ?? this.options.defaultModel,
        raw: payload
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const result = await this.chat({
        messages: [
          { role: 'system', content: 'Reply with exactly: ok' },
          { role: 'user', content: 'health check' }
        ],
        maxTokens: 16,
        temperature: 0
      });
      return { ok: true, message: `DeepSeek ready: ${result.model}` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
}
