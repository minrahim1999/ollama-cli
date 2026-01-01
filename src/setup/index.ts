/**
 * First-run setup and model verification
 */

import { OllamaClient } from '../api/client.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';
import { getEffectiveConfig, saveConfig } from '../config/index.js';
import { confirm } from '../utils/prompt.js';
import fs from 'fs/promises';
import path from 'path';

const SETUP_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.ollama-cli', 'setup.json');

interface SetupState {
  initialized: boolean;
  modelsChecked: boolean;
  lastCheck: string;
  requiredModels: {
    chat: string;
    embedding: string;
  };
}

interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

/**
 * Check if setup has been completed
 */
export async function isSetupComplete(): Promise<boolean> {
  try {
    const content = await fs.readFile(SETUP_FILE, 'utf-8');
    const state = JSON.parse(content) as SetupState;
    return state.initialized && state.modelsChecked;
  } catch {
    return false;
  }
}

/**
 * Run first-time setup
 */
export async function runSetup(): Promise<boolean> {
  console.log('');
  console.log(gradients.brand('🚀 Ollama CLI - First Run Setup'));
  console.log('');
  console.log(colors.tertiary('Verifying required models for optimal functionality...'));
  console.log('');

  const config = await getEffectiveConfig();
  const client = new OllamaClient(config.baseUrl);

  // Check Ollama connection
  displayInfo('Checking Ollama connection...');
  const isConnected = await checkOllamaConnection(client);

  if (!isConnected) {
    displayError('Cannot connect to Ollama');
    console.log('');
    console.log(colors.tertiary('Please ensure Ollama is running:'));
    console.log(colors.secondary('  ollama serve'));
    console.log('');
    console.log(colors.tertiary('Or install Ollama from: https://ollama.ai'));
    console.log('');
    return false;
  }

  displaySuccess('Connected to Ollama');
  console.log('');

  // Check required models
  const requiredModels = {
    chat: config.defaultModel || 'llama3.2',
    embedding: 'nomic-embed-text',
  };

  displayInfo('Checking required models...');
  console.log('');

  const availableModels = await getAvailableModels(client);
  const missingModels: string[] = [];

  // Check chat model
  const hasChatModel = availableModels.some(m => m.name.includes(requiredModels.chat));
  if (hasChatModel) {
    console.log(`  ✅ ${colors.success('Chat model:')} ${colors.secondary(requiredModels.chat)}`);
  } else {
    console.log(`  ❌ ${colors.error('Chat model:')} ${colors.secondary(requiredModels.chat)} ${colors.dim('(missing)')}`);
    missingModels.push(requiredModels.chat);
  }

  // Check embedding model
  const hasEmbeddingModel = availableModels.some(m => m.name.includes(requiredModels.embedding));
  if (hasEmbeddingModel) {
    console.log(`  ✅ ${colors.success('Embedding model:')} ${colors.secondary(requiredModels.embedding)}`);
  } else {
    console.log(`  ⚠️  ${colors.warning('Embedding model:')} ${colors.secondary(requiredModels.embedding)} ${colors.dim('(optional for RAG)')}`);
    // Don't add to missing models - it's optional
  }

  console.log('');

  // If models are missing, offer to install
  if (missingModels.length > 0) {
    console.log(colors.warning('⚠️  Missing required models'));
    console.log('');

    // Offer to download automatically
    console.log(colors.tertiary('Would you like to download the missing models?'));
    console.log(colors.dim('Note: Models can be large (1-10 GB) and will use disk space'));
    console.log('');

    const shouldDownload = await confirm('Download missing models now?', true);

    if (shouldDownload) {
      // Download missing models
      for (const model of missingModels) {
        const success = await downloadModel(client, model);
        if (!success) {
          console.log('');
          console.log(colors.warning('You can install manually with:'));
          console.log(colors.secondary(`  ollama pull ${model}`));
          console.log('');

          // Save partial setup state
          await saveSetupState({
            initialized: true,
            modelsChecked: false,
            lastCheck: new Date().toISOString(),
            requiredModels,
          });

          return false;
        }
      }

      // All models downloaded successfully
      console.log('');
      displaySuccess('All required models downloaded!');
      console.log('');
    } else {
      console.log('');
      console.log(colors.tertiary('To install models manually, run:'));
      console.log('');
      for (const model of missingModels) {
        console.log(colors.secondary(`  ollama pull ${model}`));
      }
      console.log('');
      console.log(colors.dim('Or choose a different model with: ollama-cli config set defaultModel <model>'));
      console.log('');

      // Save partial setup state
      await saveSetupState({
        initialized: true,
        modelsChecked: false,
        lastCheck: new Date().toISOString(),
        requiredModels,
      });

      return false;
    }
  }

  // All models available
  displaySuccess('All required models available!');
  console.log('');

  // Save setup state
  await saveSetupState({
    initialized: true,
    modelsChecked: true,
    lastCheck: new Date().toISOString(),
    requiredModels,
  });

  // Update config with verified model
  if (!config.defaultModel) {
    await saveConfig({ defaultModel: requiredModels.chat });
  }

  console.log(gradients.brand('✨ Setup Complete!'));
  console.log('');
  console.log(colors.tertiary('You can now use ollama-cli:'));
  console.log(colors.secondary('  ollama-cli chat           # Start interactive chat'));
  console.log(colors.secondary('  ollama-cli chat --tools   # Start with AI tools enabled'));
  console.log(colors.secondary('  ollama-cli ask "question" # Quick question'));
  console.log('');

  return true;
}

/**
 * Check Ollama connection
 */
async function checkOllamaConnection(client: OllamaClient): Promise<boolean> {
  try {
    startSpinner('Connecting to Ollama...');
    await client.listModels();
    stopSpinner();
    return true;
  } catch {
    stopSpinner();
    return false;
  }
}

/**
 * Get available models from Ollama
 */
async function getAvailableModels(client: OllamaClient): Promise<ModelInfo[]> {
  try {
    const response = await client.listModels();
    return response.models || [];
  } catch {
    return [];
  }
}

/**
 * Save setup state
 */
async function saveSetupState(state: SetupState): Promise<void> {
  const dir = path.dirname(SETUP_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETUP_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Reset setup state (for testing or re-initialization)
 */
export async function resetSetup(): Promise<void> {
  try {
    await fs.unlink(SETUP_FILE);
    displaySuccess('Setup state reset. Run ollama-cli again to re-initialize.');
  } catch {
    displayInfo('No setup state to reset.');
  }
}

/**
 * Verify models are still available (periodic check)
 */
export async function verifyModels(): Promise<boolean> {
  try {
    const content = await fs.readFile(SETUP_FILE, 'utf-8');
    const state = JSON.parse(content) as SetupState;

    if (!state.modelsChecked) {
      return false;
    }

    // Check if last check was more than 7 days ago
    const lastCheck = new Date(state.lastCheck);
    const daysSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCheck > 7) {
      // Re-verify models
      const config = await getEffectiveConfig();
      const client = new OllamaClient(config.baseUrl);
      const availableModels = await getAvailableModels(client);

      const hasChatModel = availableModels.some(m => m.name.includes(state.requiredModels.chat));

      if (!hasChatModel) {
        displayError(`Required model '${state.requiredModels.chat}' is no longer available`);
        console.log('');
        console.log(colors.tertiary('Please install it with:'));
        console.log(colors.secondary(`  ollama pull ${state.requiredModels.chat}`));
        console.log('');
        return false;
      }

      // Update last check time
      state.lastCheck = new Date().toISOString();
      await saveSetupState(state);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get setup status
 */
export async function getSetupStatus(): Promise<SetupState | null> {
  try {
    const content = await fs.readFile(SETUP_FILE, 'utf-8');
    return JSON.parse(content) as SetupState;
  } catch {
    return null;
  }
}

/**
 * Download a model with progress tracking
 */
async function downloadModel(client: OllamaClient, modelName: string): Promise<boolean> {
  console.log('');
  console.log(colors.secondary(`Downloading ${modelName}...`));
  console.log(colors.dim('This may take several minutes depending on model size and network speed'));
  console.log('');

  let lastStatus = '';
  let lastProgress = 0;

  try {
    await client.pullModel(modelName, (progress: { status: string; completed?: number; total?: number }) => {
      const { status, completed, total } = progress;

      // Update spinner with current status
      if (status !== lastStatus) {
        if (lastStatus) {
          stopSpinner();
        }
        lastStatus = status;
      }

      if (completed && total) {
        const percentage = Math.round((completed / total) * 100);
        const downloaded = formatBytes(completed);
        const totalSize = formatBytes(total);

        // Only update if progress changed significantly (to avoid spam)
        if (percentage !== lastProgress) {
          stopSpinner();
          startSpinner(`${status} - ${percentage}% (${downloaded} / ${totalSize})`);
          lastProgress = percentage;
        }
      } else {
        if (!lastStatus || status !== lastStatus) {
          stopSpinner();
          startSpinner(status);
        }
      }
    });

    stopSpinner();
    console.log(colors.success(`✅ ${modelName} downloaded successfully!`));
    return true;
  } catch (error) {
    stopSpinner();
    displayError(`Failed to download ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
