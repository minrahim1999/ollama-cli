/**
 * Tests for Batch Processing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { loadBatchFile, loadBatchTextFile, saveBatchResults } from './index.js';
import type { BatchResult } from './index.js';

const TEST_DIR = path.join(process.cwd(), 'test-batch');

describe('Batch Processing', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('loadBatchFile', () => {
    it('should load prompts from JSON file', async () => {
      const testFile = path.join(TEST_DIR, 'batch.json');
      const data = [
        { id: 'task-1', prompt: 'Prompt 1' },
        { id: 'task-2', prompt: 'Prompt 2', variables: { key: 'value' } },
      ];

      await fs.writeFile(testFile, JSON.stringify(data));
      const items = await loadBatchFile(testFile);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('task-1');
      expect(items[0]?.prompt).toBe('Prompt 1');
      expect(items[1]?.variables).toEqual({ key: 'value' });
    });

    it('should handle array of strings', async () => {
      const testFile = path.join(TEST_DIR, 'batch.json');
      const data = ['Prompt 1', 'Prompt 2'];

      await fs.writeFile(testFile, JSON.stringify(data));
      const items = await loadBatchFile(testFile);

      expect(items).toHaveLength(2);
      expect(items[0]?.prompt).toBe('Prompt 1');
      expect(items[0]?.id).toBe('item-1');
      expect(items[1]?.id).toBe('item-2');
    });

    it('should throw error for invalid format', async () => {
      const testFile = path.join(TEST_DIR, 'invalid.json');
      await fs.writeFile(testFile, JSON.stringify({ invalid: 'format' }));

      await expect(loadBatchFile(testFile)).rejects.toThrow();
    });
  });

  describe('loadBatchTextFile', () => {
    it('should load prompts from text file', async () => {
      const testFile = path.join(TEST_DIR, 'batch.txt');
      const content = 'Prompt 1\nPrompt 2\nPrompt 3';

      await fs.writeFile(testFile, content);
      const items = await loadBatchTextFile(testFile);

      expect(items).toHaveLength(3);
      expect(items[0]?.prompt).toBe('Prompt 1');
      expect(items[1]?.prompt).toBe('Prompt 2');
      expect(items[2]?.prompt).toBe('Prompt 3');
    });

    it('should skip empty lines', async () => {
      const testFile = path.join(TEST_DIR, 'batch.txt');
      const content = 'Prompt 1\n\n\nPrompt 2\n';

      await fs.writeFile(testFile, content);
      const items = await loadBatchTextFile(testFile);

      expect(items).toHaveLength(2);
    });

    it('should trim whitespace', async () => {
      const testFile = path.join(TEST_DIR, 'batch.txt');
      const content = '  Prompt 1  \n  Prompt 2  ';

      await fs.writeFile(testFile, content);
      const items = await loadBatchTextFile(testFile);

      expect(items[0]?.prompt).toBe('Prompt 1');
      expect(items[1]?.prompt).toBe('Prompt 2');
    });
  });

  describe('saveBatchResults', () => {
    it('should save results to JSON file', async () => {
      const testFile = path.join(TEST_DIR, 'results.json');
      const results: BatchResult[] = [
        {
          id: 'task-1',
          prompt: 'Prompt 1',
          response: 'Response 1',
          success: true,
          duration: 100,
        },
        {
          id: 'task-2',
          prompt: 'Prompt 2',
          response: '',
          success: false,
          error: 'Failed',
          duration: 50,
        },
      ];

      await saveBatchResults(results, testFile);

      const content = await fs.readFile(testFile, 'utf-8');
      const data = JSON.parse(content);

      expect(data.total).toBe(2);
      expect(data.successful).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.results).toHaveLength(2);
    });

    it('should include timestamp', async () => {
      const testFile = path.join(TEST_DIR, 'results.json');
      const results: BatchResult[] = [];

      await saveBatchResults(results, testFile);

      const content = await fs.readFile(testFile, 'utf-8');
      const data = JSON.parse(content);

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
