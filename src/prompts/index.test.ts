/**
 * Tests for Prompt Library
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  createPrompt,
  getPrompt,
  listPrompts,
  deletePrompt,
  extractVariables,
  renderPrompt,
  searchPrompts,
  updatePrompt,
} from './index.js';
import * as configModule from '../config/index.js';

const TEST_DIR = path.join(process.cwd(), '.test-prompts');
const TEST_PROMPTS_FILE = path.join(TEST_DIR, 'prompts.json');

describe('Prompt Library', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
    // Mock getConfigDir to use test directory
    vi.spyOn(configModule, 'getConfigDir').mockReturnValue(TEST_DIR);
    // Clean up test file
    await fs.unlink(TEST_PROMPTS_FILE).catch(() => {});
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    vi.restoreAllMocks();
  });

  describe('extractVariables', () => {
    it('should extract variables from content', () => {
      const content = 'Refactor {{file}} to use {{pattern}}';
      const variables = extractVariables(content);
      expect(variables).toEqual(['file', 'pattern']);
    });

    it('should handle no variables', () => {
      const content = 'Simple prompt without variables';
      const variables = extractVariables(content);
      expect(variables).toEqual([]);
    });

    it('should handle duplicate variables', () => {
      const content = 'Use {{var}} and {{var}} again';
      const variables = extractVariables(content);
      expect(variables).toEqual(['var']);
    });
  });

  describe('createPrompt', () => {
    it('should create a new prompt', async () => {
      const name = `test-prompt-${Date.now()}-${Math.random()}`;
      const prompt = await createPrompt(
        name,
        'Test content with {{var}}',
        'Test description'
      );

      expect(prompt.name).toBe(name);
      expect(prompt.content).toBe('Test content with {{var}}');
      expect(prompt.description).toBe('Test description');
      expect(prompt.variables).toHaveLength(1);
      expect(prompt.variables[0]?.name).toBe('var');
      expect(prompt.usageCount).toBe(0);
    });

    it('should throw error for duplicate names', async () => {
      const name = `duplicate-${Date.now()}-${Math.random()}`;
      await createPrompt(name, 'Content');
      await expect(createPrompt(name, 'Content')).rejects.toThrow();
    });
  });

  describe('renderPrompt', () => {
    it('should render prompt with variables', async () => {
      const name = `render-test-${Date.now()}-${Math.random()}`;
      const prompt = await createPrompt(name, 'Hello {{name}}!');
      const rendered = renderPrompt(prompt, {
        variables: { name: 'World' },
      });

      expect(rendered).toBe('Hello World!');
    });

    it('should use default values', async () => {
      const name = `default-test-${Date.now()}-${Math.random()}`;
      const prompt = await createPrompt(name, 'Hello {{name}}!');
      prompt.variables[0]!.default = 'Default';

      const rendered = renderPrompt(prompt, { variables: {} });
      expect(rendered).toBe('Hello Default!');
    });
  });

  describe('getPrompt', () => {
    it('should retrieve prompt by name', async () => {
      const name = `get-test-${Date.now()}-${Math.random()}`;
      await createPrompt(name, 'Content');
      const prompt = await getPrompt(name);

      expect(prompt).not.toBeNull();
      expect(prompt?.name).toBe(name);
    });

    it('should return null for non-existent prompt', async () => {
      const prompt = await getPrompt(`non-existent-${Date.now()}`);
      expect(prompt).toBeNull();
    });
  });

  describe('listPrompts', () => {
    it('should list all prompts', async () => {
      const name1 = `prompt1-${Date.now()}-${Math.random()}`;
      const name2 = `prompt2-${Date.now()}-${Math.random()}`;
      await createPrompt(name1, 'Content 1');
      await createPrompt(name2, 'Content 2');

      const prompts = await listPrompts();
      expect(prompts.length).toBeGreaterThanOrEqual(2);
      expect(prompts.some(p => p.name === name1)).toBe(true);
      expect(prompts.some(p => p.name === name2)).toBe(true);
    });

    it('should filter by category', async () => {
      const cat = `cat-${Date.now()}`;
      const name1 = `p1-${Date.now()}-${Math.random()}`;
      const name2 = `p2-${Date.now()}-${Math.random()}`;
      await createPrompt(name1, 'Content', '', cat);
      await createPrompt(name2, 'Content', '', 'other-cat');

      const prompts = await listPrompts(cat);
      expect(prompts.length).toBeGreaterThanOrEqual(1);
      expect(prompts.some(p => p.name === name1)).toBe(true);
    });
  });

  describe('searchPrompts', () => {
    it('should search by name', async () => {
      const searchTerm = `refactor-${Date.now()}`;
      await createPrompt(`${searchTerm}-test-1`, 'Content');
      await createPrompt(`review-code-other-${Date.now()}`, 'Content');

      const results = await searchPrompts(searchTerm);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.name.includes(searchTerm))).toBe(true);
    });

    it('should search by description', async () => {
      const uniqueTerm = `uniqueterm-${Date.now()}`;
      await createPrompt(`search-p1-${Date.now()}`, 'Content', `Find ${uniqueTerm} bugs`);
      await createPrompt(`search-p2-${Date.now()}`, 'Content', 'Write tests');

      const results = await searchPrompts(uniqueTerm);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.description.includes(uniqueTerm))).toBe(true);
    });
  });

  describe('updatePrompt', () => {
    it('should update prompt content', async () => {
      const uniqueName = `update-test-${Date.now()}`;
      await createPrompt(uniqueName, 'Old content');
      const updated = await updatePrompt(uniqueName, {
        content: 'New content',
      });

      expect(updated.content).toBe('New content');
    });
  });

  describe('deletePrompt', () => {
    it('should delete prompt', async () => {
      const name = `delete-test-${Date.now()}-${Math.random()}`;
      await createPrompt(name, 'Content');
      const deleted = await deletePrompt(name);

      expect(deleted).toBe(true);

      const prompt = await getPrompt(name);
      expect(prompt).toBeNull();
    });

    it('should return false for non-existent prompt', async () => {
      const deleted = await deletePrompt(`non-existent-${Date.now()}`);
      expect(deleted).toBe(false);
    });
  });
});
