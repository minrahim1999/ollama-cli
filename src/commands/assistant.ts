/**
 * Assistant command
 * Manage AI assistants
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import readline from 'readline/promises';
import {
  listAssistants,
  getAssistant,
  createAssistant,
  deleteAssistant,
  setDefaultAssistant,
  resetToDefaultAssistants,
  loadAssistantsConfig,
} from '../assistants/index.js';
import { displayError, displaySuccess } from '../ui/display.js';

type AssistantCommand = 'list' | 'create' | 'delete' | 'use' | 'reset' | 'show';

export async function assistantCommand(
  command: AssistantCommand,
  ...args: string[]
): Promise<void> {
  try {
    switch (command) {
      case 'list':
        await listAssistantsCommand();
        break;

      case 'show':
        if (args.length === 0) {
          displayError('Usage: ollama-cli assistant show <id>');
          process.exit(1);
        }
        await showAssistantCommand(args[0]!);
        break;

      case 'create':
        await createAssistantCommand();
        break;

      case 'delete':
        if (args.length === 0) {
          displayError('Usage: ollama-cli assistant delete <id>');
          process.exit(1);
        }
        await deleteAssistantCommand(args[0]!);
        break;

      case 'use':
        if (args.length === 0) {
          displayError('Usage: ollama-cli assistant use <id>');
          process.exit(1);
        }
        await useAssistantCommand(args[0]!);
        break;

      case 'reset':
        await resetAssistantsCommand();
        break;

      default:
        displayError(`Unknown assistant command: ${command}`);
        console.log(chalk.grey('\nAvailable commands:'));
        console.log(chalk.white('  list           ') + chalk.grey('- List all assistants'));
        console.log(chalk.white('  show <id>      ') + chalk.grey('- Show assistant details'));
        console.log(chalk.white('  create         ') + chalk.grey('- Create a new assistant'));
        console.log(chalk.white('  delete <id>    ') + chalk.grey('- Delete an assistant'));
        console.log(chalk.white('  use <id>       ') + chalk.grey('- Set default assistant'));
        console.log(chalk.white('  reset          ') + chalk.grey('- Reset to default assistants'));
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('An unknown error occurred');
    }
    process.exit(1);
  }
}

/**
 * List all assistants
 */
async function listAssistantsCommand(): Promise<void> {
  const config = await loadAssistantsConfig();
  const assistants = await listAssistants();

  console.log(chalk.bold.cyan('\nAI Assistants'));
  console.log(chalk.grey('─'.repeat(70)) + '\n');

  const table = new Table({
    head: [
      chalk.cyan(''),
      chalk.cyan('ID'),
      chalk.cyan('NAME'),
      chalk.cyan('DESCRIPTION'),
      chalk.cyan('TOOLS'),
    ],
    style: {
      head: [],
      border: ['grey'],
    },
    colWidths: [3, 15, 20, 35, 8],
  });

  for (const assistant of assistants) {
    const isDefault = assistant.id === config.defaultAssistantId;
    const marker = isDefault ? chalk.green('✓') : '';

    table.push([
      marker,
      chalk.grey(assistant.id.substring(0, 12) + '...'),
      chalk.white(`${assistant.emoji} ${assistant.name}`),
      chalk.grey(assistant.description),
      assistant.toolsEnabled ? chalk.green('Yes') : chalk.grey('No'),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.grey(`\nTotal: ${assistants.length} assistant${assistants.length === 1 ? '' : 's'}`));
  console.log(chalk.grey(`Default: ${chalk.cyan(config.defaultAssistantId)}\n`));
}

/**
 * Show assistant details
 */
async function showAssistantCommand(id: string): Promise<void> {
  const assistant = await getAssistant(id);

  if (!assistant) {
    displayError(`Assistant not found: ${id}`);
    process.exit(1);
  }

  const config = await loadAssistantsConfig();
  const isDefault = assistant.id === config.defaultAssistantId;

  console.log(chalk.bold.cyan(`\n${assistant.emoji} ${assistant.name}`));
  console.log(chalk.grey('─'.repeat(70)));
  console.log(chalk.white('ID:          ') + chalk.grey(assistant.id));
  console.log(chalk.white('Description: ') + chalk.grey(assistant.description));
  console.log(chalk.white('Tools:       ') + (assistant.toolsEnabled ? chalk.green('Enabled') : chalk.grey('Disabled')));
  console.log(chalk.white('Default:     ') + (isDefault ? chalk.green('Yes') : chalk.grey('No')));
  console.log(chalk.white('Created:     ') + chalk.grey(new Date(assistant.createdAt).toLocaleString()));
  console.log(chalk.white('Updated:     ') + chalk.grey(new Date(assistant.updatedAt).toLocaleString()));

  console.log(chalk.bold.white('\nSystem Prompt:'));
  console.log(chalk.grey('─'.repeat(70)));
  console.log(chalk.grey(assistant.systemPrompt));
  console.log('');
}

/**
 * Create a new assistant
 */
async function createAssistantCommand(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.bold.cyan('\nCreate New Assistant'));
  console.log(chalk.grey('─'.repeat(70)) + '\n');

  try {
    const name = await rl.question(chalk.white('Name: '));
    const description = await rl.question(chalk.white('Description: '));
    const emoji = await rl.question(chalk.white('Emoji (default 🤖): ')) || '🤖';
    const toolsInput = await rl.question(chalk.white('Enable tools? (y/n, default y): '));
    const toolsEnabled = toolsInput.toLowerCase() !== 'n';

    console.log(chalk.grey('\nEnter system prompt (press Enter twice when done):'));
    const promptLines: string[] = [];
    let emptyLineCount = 0;

    while (emptyLineCount < 2) {
      const line = await rl.question('');
      if (line === '') {
        emptyLineCount++;
      } else {
        emptyLineCount = 0;
        promptLines.push(line);
      }
    }

    const systemPrompt = promptLines.join('\n').trim();

    if (!name || !description || !systemPrompt) {
      displayError('Name, description, and system prompt are required');
      process.exit(1);
    }

    const assistant = await createAssistant({
      name,
      description,
      systemPrompt,
      toolsEnabled,
      emoji,
    });

    displaySuccess(`Assistant created: ${assistant.emoji} ${assistant.name} (${assistant.id})`);
  } finally {
    rl.close();
  }
}

/**
 * Delete an assistant
 */
async function deleteAssistantCommand(id: string): Promise<void> {
  const assistant = await getAssistant(id);

  if (!assistant) {
    displayError(`Assistant not found: ${id}`);
    process.exit(1);
  }

  const deleted = await deleteAssistant(id);

  if (deleted) {
    displaySuccess(`Deleted assistant: ${assistant.emoji} ${assistant.name}`);
  } else {
    displayError('Failed to delete assistant');
    process.exit(1);
  }
}

/**
 * Set default assistant
 */
async function useAssistantCommand(id: string): Promise<void> {
  const assistant = await getAssistant(id);

  if (!assistant) {
    displayError(`Assistant not found: ${id}`);
    process.exit(1);
  }

  const success = await setDefaultAssistant(id);

  if (success) {
    displaySuccess(`Default assistant set to: ${assistant.emoji} ${assistant.name}`);
  } else {
    displayError('Failed to set default assistant');
    process.exit(1);
  }
}

/**
 * Reset to default assistants
 */
async function resetAssistantsCommand(): Promise<void> {
  await resetToDefaultAssistants();
  displaySuccess('Reset to default assistants');
}
