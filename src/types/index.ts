/**
 * Core type definitions for Ollama CLI
 */

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
  autoPlan?: boolean | undefined; // Enable automatic planning for complex tasks
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string | undefined;
}

export interface ChatSession {
  id: string;
  name?: string | undefined;
  model: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  contextConfig?: import('./context.js').ContextConfig | undefined;
  branchMetadata?: import('./branches.js').BranchMetadata | undefined;
}

export interface ChatRequestParams {
  model: string;
  messages: Message[];
  stream?: boolean;
  format?: {
    type: 'json';
    schema?: Record<string, unknown>;
  };
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface ChatResponseChunk {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface GenerateRequestParams {
  model: string;
  prompt: string;
  stream?: boolean;
  format?: 'json';
  system?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface ModelsResponse {
  models: Model[];
}

export interface OllamaError {
  error: string;
}

export interface CLIOptions {
  model?: string;
  session?: string;
  system?: string;
  json?: string;
  raw?: boolean;
  debug?: boolean;
}
