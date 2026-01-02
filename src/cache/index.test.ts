/**
 * Cache Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCache,
  setCache,
  generateCacheKey,
  cleanCache,
  clearAllCache,
  getCacheStats,
  invalidateByModel,
} from './index.js';

describe('Smart Cache', () => {
  beforeEach(async () => {
    await clearAllCache();
  });

  afterEach(async () => {
    await clearAllCache();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent keys for same inputs', () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Hello world',
        temperature: 0.7,
      };

      const key1 = generateCacheKey(metadata);
      const key2 = generateCacheKey(metadata);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different keys for different inputs', () => {
      const metadata1 = {
        model: 'llama3.2',
        prompt: 'Hello world',
      };

      const metadata2 = {
        model: 'llama3.2',
        prompt: 'Hello universe',
      };

      const key1 = generateCacheKey(metadata1);
      const key2 = generateCacheKey(metadata2);

      expect(key1).not.toBe(key2);
    });

    it('should consider temperature in key generation', () => {
      const metadata1 = {
        model: 'llama3.2',
        prompt: 'Hello',
        temperature: 0.5,
      };

      const metadata2 = {
        model: 'llama3.2',
        prompt: 'Hello',
        temperature: 0.8,
      };

      const key1 = generateCacheKey(metadata1);
      const key2 = generateCacheKey(metadata2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Operations', () => {
    it('should set and get cache values', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Test prompt',
      };

      await setCache(metadata, 'Test response');

      const cached = await getCache(metadata);
      expect(cached).toBe('Test response');
    });

    it('should return null for cache miss', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Non-existent prompt',
      };

      const cached = await getCache(metadata);
      expect(cached).toBeNull();
    });

    it('should overwrite existing cache entries', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Test prompt',
      };

      await setCache(metadata, 'First response');
      await setCache(metadata, 'Second response');

      const cached = await getCache(metadata);
      expect(cached).toBe('Second response');
    });

    it('should track cache hits', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Test prompt',
      };

      await setCache(metadata, 'Response');

      // Get multiple times to increment hits
      await getCache(metadata);
      await getCache(metadata);
      await getCache(metadata);

      const stats = await getCacheStats();
      expect(stats.totalHits).toBe(3);
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect custom TTL', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Test prompt',
      };

      // Set with 100ms TTL
      await setCache(metadata, 'Response', { ttl: 100 });

      // Should exist immediately
      let cached = await getCache(metadata);
      expect(cached).toBe('Response');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      cached = await getCache(metadata);
      expect(cached).toBeNull();
    });

    it('should clean expired entries', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Test prompt',
      };

      // Set with short TTL
      await setCache(metadata, 'Response', { ttl: 50 });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = await cleanCache();
      expect(removed).toBeGreaterThan(0);

      const cached = await getCache(metadata);
      expect(cached).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate statistics', async () => {
      await setCache({ model: 'llama3.2', prompt: 'Prompt 1' }, 'Response 1');
      await setCache({ model: 'llama3.2', prompt: 'Prompt 2' }, 'Response 2');

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should calculate hit rate', async () => {
      const metadata = {
        model: 'llama3.2',
        prompt: 'Test prompt',
      };

      await setCache(metadata, 'Response');
      await getCache(metadata); // Hit
      await getCache(metadata); // Hit

      const stats = await getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by model', async () => {
      await setCache({ model: 'llama3.2', prompt: 'Prompt 1' }, 'Response 1');
      await setCache({ model: 'mistral', prompt: 'Prompt 2' }, 'Response 2');

      const removed = await invalidateByModel('llama3.2');
      expect(removed).toBe(1);

      const cached1 = await getCache({ model: 'llama3.2', prompt: 'Prompt 1' });
      const cached2 = await getCache({ model: 'mistral', prompt: 'Prompt 2' });

      expect(cached1).toBeNull();
      expect(cached2).toBe('Response 2');
    });

    it('should clear all cache', async () => {
      await setCache({ model: 'llama3.2', prompt: 'Prompt 1' }, 'Response 1');
      await setCache({ model: 'llama3.2', prompt: 'Prompt 2' }, 'Response 2');

      await clearAllCache();

      const stats = await getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Cache Limits', () => {
    it('should enforce max entries limit', async () => {
      const maxEntries = 5;

      // Add more entries than the limit
      for (let i = 0; i < 10; i++) {
        await setCache(
          { model: 'llama3.2', prompt: `Prompt ${i}` },
          `Response ${i}`,
          { maxEntries }
        );
      }

      const stats = await getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(maxEntries);
    });

    it('should prioritize frequently accessed entries', async () => {
      const maxEntries = 3;

      // Add entries
      await setCache({ model: 'llama3.2', prompt: 'Prompt 1' }, 'Response 1');
      await setCache({ model: 'llama3.2', prompt: 'Prompt 2' }, 'Response 2');

      // Access first entry multiple times to increase hits
      await getCache({ model: 'llama3.2', prompt: 'Prompt 1' });
      await getCache({ model: 'llama3.2', prompt: 'Prompt 1' });
      await getCache({ model: 'llama3.2', prompt: 'Prompt 1' });

      // Add more entries to trigger eviction
      await setCache({ model: 'llama3.2', prompt: 'Prompt 3' }, 'Response 3', {
        maxEntries,
      });
      await setCache({ model: 'llama3.2', prompt: 'Prompt 4' }, 'Response 4', {
        maxEntries,
      });

      // Frequently accessed entry should still be there
      const cached = await getCache({ model: 'llama3.2', prompt: 'Prompt 1' });
      expect(cached).toBe('Response 1');
    });
  });
});
