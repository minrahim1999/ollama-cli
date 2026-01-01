/**
 * RAG (Retrieval-Augmented Generation) type definitions
 */

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[] | undefined;
}

export interface DocumentMetadata {
  source: string; // file path or URL
  type: 'code' | 'documentation' | 'text';
  language?: string | undefined;
  createdAt: string;
  size: number;
}

export interface VectorStore {
  documents: Document[];
  embeddingModel: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  document: Document;
  score: number; // Cosine similarity score (0-1)
  rank: number;
}

export interface SearchOptions {
  topK?: number | undefined; // Number of results to return (default: 5)
  minScore?: number | undefined; // Minimum similarity score (default: 0.5)
  filter?: DocumentFilter | undefined;
}

export interface DocumentFilter {
  type?: 'code' | 'documentation' | 'text' | undefined;
  language?: string | undefined;
  source?: string | undefined;
}

export interface EmbeddingOptions {
  model?: string | undefined; // Embedding model (default: 'nomic-embed-text')
  truncate?: boolean | undefined;
}
