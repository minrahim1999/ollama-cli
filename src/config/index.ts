/**
 * Configuration management for Ollama CLI
 * Handles reading, writing, and merging configuration from multiple sources
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import type { OllamaConfig } from '../types/index.js';

const CONFIG_DIR = path.join(homedir(), '.ollama-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434/api',
  defaultModel: 'llama2',
  timeoutMs: 30000,
};

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
}

/**
 * Load configuration from file
 */
export async function loadConfig(): Promise<OllamaConfig> {
  await ensureConfigDir();

  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const fileConfig = JSON.parse(data) as Partial<OllamaConfig>;

    // Merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...fileConfig,
    };
  } catch (error) {
    // Config file doesn't exist or is invalid, use defaults
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: Partial<OllamaConfig>): Promise<void> {
  await ensureConfigDir();

  const currentConfig = await loadConfig();
  const newConfig = {
    ...currentConfig,
    ...config,
  };

  await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');
}

/**
 * Get a specific configuration value
 */
export async function getConfigValue(key: keyof OllamaConfig): Promise<string | number> {
  const config = await loadConfig();
  return config[key];
}

/**
 * Set a specific configuration value
 */
export async function setConfigValue(
  key: keyof OllamaConfig,
  value: string | number
): Promise<void> {
  const config = await loadConfig();

  // Validate and convert value based on key
  if (key === 'timeoutMs') {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (isNaN(numValue) || numValue <= 0) {
      throw new Error('timeoutMs must be a positive integer');
    }
    config[key] = numValue;
  } else if (key === 'baseUrl') {
    const urlValue = String(value);
    try {
      new URL(urlValue);
      config[key] = urlValue;
    } catch {
      throw new Error('baseUrl must be a valid URL');
    }
  } else {
    config[key] = String(value);
  }

  await saveConfig(config);
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
}

/**
 * Get effective configuration with environment variable overrides
 */
export async function getEffectiveConfig(): Promise<OllamaConfig> {
  const config = await loadConfig();

  // Environment variables override config file
  if (process.env['OLLAMA_BASE_URL']) {
    config.baseUrl = process.env['OLLAMA_BASE_URL'];
  }

  if (process.env['OLLAMA_MODEL']) {
    config.defaultModel = process.env['OLLAMA_MODEL'];
  }

  return config;
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get sessions directory path
 */
export function getSessionsDir(): string {
  return path.join(CONFIG_DIR, 'sessions');
}

/**
 * Ensure sessions directory exists
 */
export async function ensureSessionsDir(): Promise<void> {
  const sessionsDir = getSessionsDir();
  try {
    await fs.mkdir(sessionsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
}
