/**
 * Ollama API client
 * Handles communication with the Ollama REST API
 */

import type {
  ChatRequestParams,
  ChatResponseChunk,
  GenerateRequestParams,
  GenerateResponse,
  ModelsResponse,
  OllamaError,
} from '../types/index.js';

export class OllamaClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs: number = 30000) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Stream chat responses from Ollama
   */
  async *chat(params: ChatRequestParams): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/chat`;
    const requestParams = { ...params, stream: true };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json()) as OllamaError;
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;

            try {
              const chunk = JSON.parse(line) as ChatResponseChunk;

              if (chunk.message?.content) {
                yield chunk.message.content;
              }

              if (chunk.done) {
                return;
              }
            } catch (error) {
              // Skip malformed JSON chunks
              console.error('Failed to parse chunk:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running? Try: ollama serve`
          );
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Generate a one-shot response (non-streaming)
   */
  async generate(params: GenerateRequestParams): Promise<GenerateResponse> {
    const url = `${this.baseUrl}/generate`;
    const requestParams = { ...params, stream: false };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json()) as OllamaError;
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as GenerateResponse;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running? Try: ollama serve`
          );
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelsResponse> {
    const url = `${this.baseUrl}/tags`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json()) as OllamaError;
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as ModelsResponse;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running? Try: ollama serve`
          );
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }
}
