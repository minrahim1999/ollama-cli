/**
 * Smart Cache - Cache AI responses with hash-based keys and TTL
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import type { CacheEntry, CacheStore, CacheMetadata, CacheOptions, CacheStats } from '../types/cache.js';

// Default cache options
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_ENTRIES = 1000;

/**
 * Get cache file path
 */
function getCachePath(): string {
  return path.join(homedir(), '.ollama-cli', 'cache.json');
}

/**
 * Load cache store
 */
async function loadStore(): Promise<CacheStore> {
  try {
    const cachePath = getCachePath();
    const content = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(content) as CacheStore;
  } catch {
    return {
      entries: [],
      lastCleaned: new Date().toISOString(),
    };
  }
}

/**
 * Save cache store
 */
async function saveStore(store: CacheStore): Promise<void> {
  const cacheDir = path.dirname(getCachePath());
  await fs.mkdir(cacheDir, { recursive: true });

  const cachePath = getCachePath();
  await fs.writeFile(cachePath, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Generate cache key from metadata
 */
export function generateCacheKey(metadata: CacheMetadata): string {
  const data = JSON.stringify({
    model: metadata.model,
    prompt: metadata.prompt,
    temperature: metadata.temperature,
    system: metadata.system,
  });
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Get cached value
 */
export async function getCache(metadata: CacheMetadata): Promise<string | null> {
  const store = await loadStore();
  const key = generateCacheKey(metadata);

  const entry = store.entries.find((e) => e.key === key);

  if (!entry) {
    return null;
  }

  // Check if expired
  const now = new Date().getTime();
  const expiresAt = new Date(entry.expiresAt).getTime();

  if (now > expiresAt) {
    // Remove expired entry
    store.entries = store.entries.filter((e) => e.key !== key);
    await saveStore(store);
    return null;
  }

  // Increment hit counter
  entry.hits++;
  await saveStore(store);

  return entry.value;
}

/**
 * Set cache value
 */
export async function setCache(
  metadata: CacheMetadata,
  value: string,
  options: CacheOptions = {}
): Promise<void> {
  const store = await loadStore();
  const key = generateCacheKey(metadata);

  const ttl = options.ttl || DEFAULT_TTL;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl);

  // Remove existing entry if present
  store.entries = store.entries.filter((e) => e.key !== key);

  // Add new entry
  const entry: CacheEntry = {
    key,
    value,
    metadata,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    hits: 0,
  };

  store.entries.push(entry);

  // Enforce limits
  await enforceLimits(store, options);

  await saveStore(store);
}

/**
 * Clear expired entries
 */
export async function cleanCache(): Promise<number> {
  const store = await loadStore();
  const now = new Date().getTime();
  const initialCount = store.entries.length;

  store.entries = store.entries.filter((entry) => {
    const expiresAt = new Date(entry.expiresAt).getTime();
    return now <= expiresAt;
  });

  store.lastCleaned = new Date().toISOString();
  await saveStore(store);

  return initialCount - store.entries.length;
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  const store: CacheStore = {
    entries: [],
    lastCleaned: new Date().toISOString(),
  };
  await saveStore(store);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const store = await loadStore();
  const entries = store.entries;

  let totalSize = 0;
  let totalHits = 0;

  for (const entry of entries) {
    const entrySize = JSON.stringify(entry).length;
    totalSize += entrySize;
    totalHits += entry.hits;
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const hitRate = entries.length > 0 ? totalHits / (totalHits + entries.length) : 0;

  return {
    totalEntries: entries.length,
    totalHits,
    totalSize,
    hitRate,
    oldestEntry: sorted[0]?.createdAt,
    newestEntry: sorted[sorted.length - 1]?.createdAt,
  };
}

/**
 * Invalidate cache entries by model
 */
export async function invalidateByModel(model: string): Promise<number> {
  const store = await loadStore();
  const initialCount = store.entries.length;

  store.entries = store.entries.filter((entry) => entry.metadata.model !== model);

  await saveStore(store);

  return initialCount - store.entries.length;
}

/**
 * Enforce cache limits (size, entries)
 */
async function enforceLimits(store: CacheStore, options: CacheOptions): Promise<void> {
  const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
  const maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;

  // Enforce max entries (remove oldest, least used first)
  if (store.entries.length > maxEntries) {
    store.entries.sort((a, b) => {
      // Sort by hits (ascending) then by age (oldest first)
      if (a.hits !== b.hits) {
        return a.hits - b.hits;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    store.entries = store.entries.slice(-(maxEntries));
  }

  // Enforce max size
  let currentSize = JSON.stringify(store).length;
  while (currentSize > maxSize && store.entries.length > 0) {
    // Remove oldest, least used entry
    store.entries.sort((a, b) => {
      if (a.hits !== b.hits) {
        return a.hits - b.hits;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    store.entries.shift(); // Remove first (oldest, least used)
    currentSize = JSON.stringify(store).length;
  }
}

/**
 * Auto-clean cache on startup (remove expired entries)
 */
export async function autoClean(): Promise<void> {
  const store = await loadStore();
  const lastCleaned = new Date(store.lastCleaned).getTime();
  const now = new Date().getTime();

  // Clean if last cleaned was more than 24 hours ago
  if (now - lastCleaned > 24 * 60 * 60 * 1000) {
    await cleanCache();
  }
}
