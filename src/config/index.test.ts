/**
 * Configuration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  loadConfig,
  saveConfig,
  setConfigValue,
  resetConfig,
} from './index.js';

const TEST_CONFIG_DIR = path.join(homedir(), '.ollama-cli-test');
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'config.json');

describe('Configuration', () => {
  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  });

  it('should return default config when file does not exist', async () => {
    const config = await loadConfig();
    expect(config.baseUrl).toBe('http://localhost:11434/api');
    expect(config.defaultModel).toBe('llama2');
    expect(config.timeoutMs).toBe(30000);
  });

  it('should save and load config', async () => {
    await saveConfig({
      defaultModel: 'mistral',
    });

    const config = await loadConfig();
    expect(config.defaultModel).toBe('mistral');
    expect(config.baseUrl).toBe('http://localhost:11434/api'); // Should merge with defaults
  });

  it('should set individual config values', async () => {
    await setConfigValue('defaultModel', 'codellama');
    const config = await loadConfig();
    expect(config.defaultModel).toBe('codellama');
  });

  it('should validate timeoutMs as positive integer', async () => {
    await expect(setConfigValue('timeoutMs', -1)).rejects.toThrow(
      'timeoutMs must be a positive integer'
    );
  });

  it('should validate baseUrl as valid URL', async () => {
    await expect(setConfigValue('baseUrl', 'not-a-url')).rejects.toThrow(
      'baseUrl must be a valid URL'
    );
  });

  it('should reset config to defaults', async () => {
    await saveConfig({
      defaultModel: 'custom-model',
    });

    await resetConfig();
    const config = await loadConfig();
    expect(config.defaultModel).toBe('llama2');
  });
});
