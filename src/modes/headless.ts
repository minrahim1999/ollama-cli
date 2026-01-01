/**
 * Headless Mode - Non-interactive CLI execution
 * For CI/CD pipelines, automation, and scripting
 */

import type { Message } from '../types/index.js';
import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';

export interface HeadlessOptions {
  model?: string | undefined;
  baseUrl?: string | undefined;
  systemPrompt?: string | undefined;
  temperature?: number | undefined;
  format?: 'json' | 'text' | undefined;
  timeout?: number | undefined;
}

export interface HeadlessResult {
  success: boolean;
  response: string;
  error?: string;
  metadata: {
    model: string;
    tokensUsed?: number;
    duration: number;
  };
}

/**
 * Execute a single prompt in headless mode
 */
export async function executeHeadless(
  prompt: string,
  options: HeadlessOptions = {}
): Promise<HeadlessResult> {
  const startTime = Date.now();

  try {
    // Get configuration
    const config = await getEffectiveConfig();
    const model = options.model || config.defaultModel;
    const baseUrl = options.baseUrl || config.baseUrl;
    const client = new OllamaClient(baseUrl, options.timeout);

    // Prepare messages
    const messages: Message[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    // Execute request
    let response = '';

    // Build chat parameters
    const chatParams: { model: string; messages: Message[]; options?: { temperature: number } } = {
      model,
      messages,
    };

    if (options.temperature !== undefined) {
      chatParams.options = { temperature: options.temperature };
    }

    for await (const chunk of client.chat(chatParams)) {
      response += chunk;
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      response,
      metadata: {
        model,
        duration,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: options.model || 'unknown',
        duration,
      },
    };
  }
}

/**
 * Execute multiple prompts in sequence
 */
export async function executeBatchHeadless(
  prompts: string[],
  options: HeadlessOptions = {}
): Promise<HeadlessResult[]> {
  const results: HeadlessResult[] = [];

  for (const prompt of prompts) {
    const result = await executeHeadless(prompt, options);
    results.push(result);

    // Stop on error if not in continue mode
    if (!result.success && !options.format) {
      break;
    }
  }

  return results;
}

/**
 * Format headless output for display
 */
export function formatHeadlessOutput(
  result: HeadlessResult,
  format: 'json' | 'text' = 'text'
): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (result.success) {
    return result.response;
  } else {
    return `Error: ${result.error || 'Unknown error'}`;
  }
}

/**
 * Format batch output
 */
export function formatBatchOutput(
  results: HeadlessResult[],
  format: 'json' | 'text' = 'text'
): string {
  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }

  return results.map((result, index) => {
    const header = `\n[${ index + 1}/${results.length}] ${result.success ? '✓' : '✗'}`;
    const content = result.success ? result.response : `Error: ${result.error}`;
    const duration = `Duration: ${result.metadata.duration}ms`;
    return `${header}\n${content}\n${duration}`;
  }).join('\n\n');
}

/**
 * Get exit code from result
 */
export function getExitCode(result: HeadlessResult | HeadlessResult[]): number {
  if (Array.isArray(result)) {
    return result.every(r => r.success) ? 0 : 1;
  }
  return result.success ? 0 : 1;
}
