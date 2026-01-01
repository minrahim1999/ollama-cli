/**
 * Setup command - Manage first-run setup and model verification
 */

import { runSetup, resetSetup, getSetupStatus } from '../setup/index.js';
import { displayError } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';

export type SetupCommand = 'init' | 'reset' | 'status';

/**
 * Main setup command handler
 */
export async function setupCommand(command: SetupCommand): Promise<void> {
  switch (command) {
    case 'init':
      await runSetup();
      break;

    case 'reset':
      await resetSetup();
      break;

    case 'status':
      await showStatus();
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: init, reset, status');
  }
}

/**
 * Show setup status
 */
async function showStatus(): Promise<void> {
  const status = await getSetupStatus();

  console.log('');
  console.log(gradients.brand('Setup Status'));
  console.log('');

  if (!status) {
    console.log(colors.warning('⚠️  Setup not initialized'));
    console.log('');
    console.log(colors.tertiary('Run setup with:'));
    console.log(colors.secondary('  ollama-cli setup init'));
    console.log('');
    return;
  }

  console.log(colors.secondary(`Initialized: ${status.initialized ? '✅' : '❌'}`));
  console.log(colors.secondary(`Models Checked: ${status.modelsChecked ? '✅' : '❌'}`));
  console.log(colors.dim(`Last Check: ${new Date(status.lastCheck).toLocaleString()}`));
  console.log('');
  console.log(colors.secondary('Required Models:'));
  console.log(`  Chat: ${colors.tertiary(status.requiredModels.chat)}`);
  console.log(`  Embedding: ${colors.tertiary(status.requiredModels.embedding)}`);
  console.log('');
}
