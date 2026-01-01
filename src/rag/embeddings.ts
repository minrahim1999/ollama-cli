/**
 * Vector embeddings generation using Ollama
 */

import type { EmbeddingOptions } from '../types/rag.js';

const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

export interface EmbeddingResponse {
  embedding: number[];
}

/**
 * Generate embedding for text using Ollama
 */
export async function generateEmbedding(
  text: string,
  baseUrl: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const model = options.model || DEFAULT_EMBEDDING_MODEL;

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: text,
        options: {
          truncate: options.truncate ?? true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(
  texts: string[],
  baseUrl: string,
  options: EmbeddingOptions = {}
): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in parallel (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => generateEmbedding(text, baseUrl, options))
    );
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magnitudeA += a[i]! * a[i]!;
    magnitudeB += b[i]! * b[i]!;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}
