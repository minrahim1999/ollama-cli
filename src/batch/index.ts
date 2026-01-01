/**
 * Batch processing system
 * Process multiple prompts from files
 */

import fs from 'fs/promises';
import type { OllamaClient } from '../api/client.js';

export interface BatchItem {
  id: string;
  prompt: string;
  variables?: Record<string, string> | undefined;
}

export interface BatchResult {
  id: string;
  prompt: string;
  response: string;
  success: boolean;
  error?: string | undefined;
  duration: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentItem?: string | undefined;
}

/**
 * Load batch items from JSON file
 */
export async function loadBatchFile(filePath: string): Promise<BatchItem[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      prompt: item.prompt || item,
      variables: item.variables,
    }));
  }

  throw new Error('Batch file must contain an array of prompts');
}

/**
 * Load batch items from text file (one prompt per line)
 */
export async function loadBatchTextFile(filePath: string): Promise<BatchItem[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  return lines.map((line, index) => ({
    id: `item-${index + 1}`,
    prompt: line.trim(),
  }));
}

/**
 * Execute batch processing
 */
export async function executeBatch(
  items: BatchItem[],
  client: OllamaClient,
  model: string,
  onProgress?: (progress: BatchProgress) => void
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  let completed = 0;
  let failed = 0;

  for (const item of items) {
    const startTime = Date.now();

    if (onProgress) {
      onProgress({
        total: items.length,
        completed,
        failed,
        currentItem: item.prompt.substring(0, 50) + '...',
      });
    }

    try {
      let fullResponse = '';

      for await (const chunk of client.chat({
        model,
        messages: [
          {
            role: 'user',
            content: item.prompt,
          },
        ],
      })) {
        fullResponse += chunk;
      }

      results.push({
        id: item.id,
        prompt: item.prompt,
        response: fullResponse,
        success: true,
        duration: Date.now() - startTime,
      });

      completed++;
    } catch (error) {
      results.push({
        id: item.id,
        prompt: item.prompt,
        response: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });

      failed++;
    }
  }

  if (onProgress) {
    onProgress({
      total: items.length,
      completed,
      failed,
    });
  }

  return results;
}

/**
 * Save batch results to JSON file
 */
export async function saveBatchResults(
  results: BatchResult[],
  outputPath: string
): Promise<void> {
  const output = {
    timestamp: new Date().toISOString(),
    total: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');
}
