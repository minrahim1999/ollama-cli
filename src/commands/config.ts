/**
 * Config command
 * Manage CLI configuration
 */

import chalk from 'chalk';
import type { OllamaConfig } from '../types/index.js';
import {
  loadConfig,
  setConfigValue,
  resetConfig,
  getConfigValue,
} from '../config/index.js';
import { displayError, displaySuccess, displayConfig } from '../ui/display.js';

type ConfigCommand = 'set' | 'get' | 'list' | 'reset';

export async function configCommand(
  command: ConfigCommand,
  key?: string,
  value?: string
): Promise<void> {
  try {
    switch (command) {
      case 'set':
        if (!key || value === undefined) {
          displayError('Usage: ollama-cli config set <key> <value>');
          console.log(chalk.grey('\nAvailable keys:'));
          console.log(chalk.white('  baseUrl       ') + chalk.grey('- Ollama API base URL'));
          console.log(chalk.white('  defaultModel  ') + chalk.grey('- Default model to use'));
          console.log(chalk.white('  timeoutMs     ') + chalk.grey('- Request timeout in milliseconds'));
          console.log(chalk.white('  autoPlan      ') + chalk.grey('- Enable automatic planning (true|false)'));
          process.exit(1);
        }

        // Validate key
        if (!['baseUrl', 'defaultModel', 'timeoutMs', 'autoPlan'].includes(key)) {
          displayError(`Invalid configuration key: ${key}`);
          process.exit(1);
        }

        await setConfigValue(key as keyof OllamaConfig, value);
        displaySuccess(`Configuration updated: ${key} = ${value}`);
        break;

      case 'get':
        if (!key) {
          displayError('Usage: ollama-cli config get <key>');
          process.exit(1);
        }

        // Validate key
        if (!['baseUrl', 'defaultModel', 'timeoutMs', 'autoPlan'].includes(key)) {
          displayError(`Invalid configuration key: ${key}`);
          process.exit(1);
        }

        const configValue = await getConfigValue(key as keyof OllamaConfig);
        console.log(chalk.white(`${key}: `) + chalk.cyan(String(configValue)));
        break;

      case 'list':
        const config = await loadConfig();
        console.log(chalk.bold.cyan('\nConfiguration:'));
        console.log(chalk.grey('─'.repeat(50)) + '\n');
        displayConfig(config as unknown as Record<string, string | number>);
        break;

      case 'reset':
        await resetConfig();
        displaySuccess('Configuration reset to defaults');
        break;

      default:
        displayError(`Unknown config command: ${command}`);
        console.log(chalk.grey('\nAvailable commands:'));
        console.log(chalk.white('  set <key> <value>  ') + chalk.grey('- Set a configuration value'));
        console.log(chalk.white('  get <key>          ') + chalk.grey('- Get a configuration value'));
        console.log(chalk.white('  list               ') + chalk.grey('- List all configuration'));
        console.log(chalk.white('  reset              ') + chalk.grey('- Reset to defaults'));
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('An unknown error occurred');
    }
    process.exit(1);
  }
}
