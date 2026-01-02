/**
 * Cache Types - Smart caching for AI responses
 */

export interface CacheEntry {
  key: string;
  value: string;
  metadata: CacheMetadata;
  createdAt: string;
  expiresAt: string;
  hits: number;
}

export interface CacheMetadata {
  model: string;
  prompt: string;
  temperature?: number | undefined;
  system?: string | undefined;
  [key: string]: unknown;
}

export interface CacheStore {
  entries: CacheEntry[];
  lastCleaned: string;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalSize: number; // bytes
  hitRate: number; // 0-1
  oldestEntry?: string | undefined;
  newestEntry?: string | undefined;
}

export interface CacheOptions {
  ttl?: number | undefined; // Time to live in milliseconds
  maxSize?: number | undefined; // Max cache size in bytes
  maxEntries?: number | undefined; // Max number of entries
}
