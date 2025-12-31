/**
 * Models command
 * List available Ollama models
 */

import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import { displayError, displayModels } from '../ui/display.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';

export async function modelsCommand(): Promise<void> {
  const config = await getEffectiveConfig();
  const client = new OllamaClient(config.baseUrl, config.timeoutMs);

  try {
    startSpinner('Fetching models...');
    const response = await client.listModels();
    stopSpinner();

    displayModels(response.models);
    process.exit(0);
  } catch (error) {
    stopSpinner();
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('An unknown error occurred');
    }
    process.exit(1);
  }
}
