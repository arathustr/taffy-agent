export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  raw?: unknown;
}

export interface LlmProvider {
  id: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

