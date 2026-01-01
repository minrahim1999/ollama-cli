/**
 * RAG vector store and retrieval
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Document, VectorStore, SearchResult, SearchOptions, DocumentMetadata } from '../types/rag.js';
import { generateEmbedding, generateEmbeddings, cosineSimilarity } from './embeddings.js';

const VECTOR_STORE_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.ollama-cli', 'rag');
const VECTOR_STORE_FILE = path.join(VECTOR_STORE_DIR, 'vector-store.json');

/**
 * Load vector store from disk
 */
export async function loadVectorStore(): Promise<VectorStore | null> {
  try {
    await fs.mkdir(VECTOR_STORE_DIR, { recursive: true });
    const content = await fs.readFile(VECTOR_STORE_FILE, 'utf-8');
    return JSON.parse(content) as VectorStore;
  } catch {
    return null;
  }
}

/**
 * Save vector store to disk
 */
export async function saveVectorStore(store: VectorStore): Promise<void> {
  await fs.mkdir(VECTOR_STORE_DIR, { recursive: true });
  await fs.writeFile(VECTOR_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Create a new vector store
 */
export function createVectorStore(embeddingModel: string = 'nomic-embed-text'): VectorStore {
  return {
    documents: [],
    embeddingModel,
    dimensions: 768, // nomic-embed-text dimension
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add document to vector store
 */
export async function addDocument(
  content: string,
  metadata: DocumentMetadata,
  baseUrl: string,
  options: { model?: string | undefined } = {}
): Promise<Document> {
  const store = (await loadVectorStore()) || createVectorStore(options.model);

  // Generate embedding
  const embedding = await generateEmbedding(content, baseUrl, { model: store.embeddingModel });

  const document: Document = {
    id: randomUUID(),
    content,
    metadata,
    embedding,
  };

  store.documents.push(document);
  store.updatedAt = new Date().toISOString();

  await saveVectorStore(store);

  return document;
}

/**
 * Add multiple documents to vector store
 */
export async function addDocuments(
  documents: Array<{ content: string; metadata: DocumentMetadata }>,
  baseUrl: string,
  options: { model?: string | undefined; onProgress?: ((current: number, total: number) => void) | undefined } = {}
): Promise<Document[]> {
  const store = (await loadVectorStore()) || createVectorStore(options.model);

  // Generate embeddings in batches
  const contents = documents.map(d => d.content);
  const embeddings = await generateEmbeddings(contents, baseUrl, { model: store.embeddingModel });

  const newDocuments: Document[] = documents.map((doc, i) => ({
    id: randomUUID(),
    content: doc.content,
    metadata: doc.metadata,
    embedding: embeddings[i],
  }));

  store.documents.push(...newDocuments);
  store.updatedAt = new Date().toISOString();

  if (options.onProgress) {
    options.onProgress(newDocuments.length, newDocuments.length);
  }

  await saveVectorStore(store);

  return newDocuments;
}

/**
 * Search for similar documents
 */
export async function search(
  query: string,
  baseUrl: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const store = await loadVectorStore();

  if (!store || store.documents.length === 0) {
    return [];
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, baseUrl, { model: store.embeddingModel });

  // Calculate similarities
  const results: SearchResult[] = [];

  for (const doc of store.documents) {
    if (!doc.embedding) continue;

    // Apply filters
    if (options.filter) {
      if (options.filter.type && doc.metadata.type !== options.filter.type) continue;
      if (options.filter.language && doc.metadata.language !== options.filter.language) continue;
      if (options.filter.source && !doc.metadata.source.includes(options.filter.source)) continue;
    }

    const score = cosineSimilarity(queryEmbedding, doc.embedding);

    if (score >= (options.minScore ?? 0.5)) {
      results.push({
        document: doc,
        score,
        rank: 0, // Will be set after sorting
      });
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  // Set ranks and limit results
  const topK = options.topK ?? 5;
  const topResults = results.slice(0, topK);

  topResults.forEach((result, index) => {
    result.rank = index + 1;
  });

  return topResults;
}

/**
 * Clear vector store
 */
export async function clearVectorStore(): Promise<void> {
  try {
    await fs.unlink(VECTOR_STORE_FILE);
  } catch {
    // File doesn't exist, ignore
  }
}

/**
 * Get vector store statistics
 */
export async function getVectorStoreStats(): Promise<{
  documents: number;
  embeddingModel: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
  size: number;
} | null> {
  const store = await loadVectorStore();

  if (!store) return null;

  const size = (await fs.stat(VECTOR_STORE_FILE)).size;

  return {
    documents: store.documents.length,
    embeddingModel: store.embeddingModel,
    dimensions: store.dimensions,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    size,
  };
}
