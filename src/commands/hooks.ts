/**
 * Hooks command - Manage event-driven automation
 */

import {
  listHooks,
  addHook,
  removeHook,
  toggleHook,
  getDefaultHooks,
  type HookEvent,
} from '../hooks/index.js';
import { colors } from '../ui/colors.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { select, prompt } from '../utils/prompt.js';

export type HookCommand = 'list' | 'add' | 'remove' | 'enable' | 'disable' | 'examples';

/**
 * Execute hooks command
 */
export async function hooksCommand(command: HookCommand): Promise<void> {
  switch (command) {
    case 'list':
      await listHooksCmd();
      break;

    case 'add':
      await addHookCmd();
      break;

    case 'remove':
      await removeHookCmd();
      break;

    case 'enable':
      await enableHookCmd();
      break;

    case 'disable':
      await disableHookCmd();
      break;

    case 'examples':
      await showExamplesCmd();
      break;

    default:
      displayError(`Unknown command: ${command}`);
      console.log('');
      console.log('Available commands: list, add, remove, enable, disable, examples');
  }
}

/**
 * List all hooks
 */
async function listHooksCmd(): Promise<void> {
  const hooks = await listHooks();

  if (hooks.length === 0) {
    displayInfo('No hooks configured');
    console.log('');
    console.log(colors.secondary('Use "ollama-cli hooks add" to create a hook'));
    console.log(colors.secondary('Use "ollama-cli hooks examples" to see example hooks'));
    return;
  }

  console.log('');
  console.log(colors.primary('📌 Configured Hooks'));
  console.log('');

  hooks.forEach((hook, index) => {
    const status = hook.enabled ? colors.success('✓ Enabled') : colors.tertiary('✗ Disabled');
    const description = hook.description ? ` - ${hook.description}` : '';

    console.log(`${colors.brand.primary(`[${index + 1}]`)} ${status}`);
    console.log(`    ${colors.secondary('Event:')} ${hook.event}`);
    console.log(`    ${colors.secondary('Command:')} ${colors.tertiary(hook.command)}${description}`);
    console.log('');
  });
}

/**
 * Add a new hook
 */
async function addHookCmd(): Promise<void> {
  console.log('');
  console.log(colors.primary('➕ Add New Hook'));
  console.log('');

  // Select event
  const events: HookEvent[] = [
    'tool:before',
    'tool:after',
    'tool:error',
    'message:user',
    'message:assistant',
    'session:start',
    'session:end',
    'error',
  ];

  const eventDescriptions = {
    'tool:before': 'Before tool execution',
    'tool:after': 'After tool execution',
    'tool:error': 'On tool error',
    'message:user': 'When user sends a message',
    'message:assistant': 'When assistant responds',
    'session:start': 'When session starts',
    'session:end': 'When session ends',
    error: 'On any error',
  };

  const eventChoices = events.map((e) => `${e} - ${eventDescriptions[e]}`);
  const selectedChoice = await select('Select event:', eventChoices);
  const event = selectedChoice.split(' - ')[0] as HookEvent;

  // Get command
  const command = await prompt('Enter shell command:');

  // Get description
  const description = await prompt('Description (optional):');

  // Confirm
  console.log('');
  console.log(colors.secondary('Preview:'));
  console.log(`  ${colors.brand.primary('Event:')} ${event}`);
  console.log(`  ${colors.brand.primary('Command:')} ${command}`);
  if (description) {
    console.log(`  ${colors.brand.primary('Description:')} ${description}`);
  }
  console.log('');

  const confirm = await select('Add this hook?', ['Yes', 'No']);

  if (confirm === 'Yes') {
    await addHook({
      event,
      command,
      enabled: true,
      description: description || undefined,
    });

    displaySuccess('Hook added successfully');
  } else {
    displayInfo('Cancelled');
  }
}

/**
 * Remove a hook
 */
async function removeHookCmd(): Promise<void> {
  const hooks = await listHooks();

  if (hooks.length === 0) {
    displayInfo('No hooks configured');
    return;
  }

  console.log('');
  console.log(colors.primary('🗑️  Remove Hook'));
  console.log('');

  const choices = hooks.map(
    (hook, index) =>
      `[${index + 1}] ${hook.event} - ${hook.command.substring(0, 50)}${hook.command.length > 50 ? '...' : ''}`
  );
  choices.push('Cancel');

  const selected = await select('Select hook to remove:', choices);

  if (selected === 'Cancel') {
    displayInfo('Cancelled');
    return;
  }

  const index = choices.indexOf(selected);
  await removeHook(index);

  displaySuccess('Hook removed successfully');
}

/**
 * Enable a hook
 */
async function enableHookCmd(): Promise<void> {
  const hooks = await listHooks();
  const disabledHooks = hooks.filter((h) => !h.enabled);

  if (disabledHooks.length === 0) {
    displayInfo('No disabled hooks');
    return;
  }

  console.log('');
  console.log(colors.primary('✓ Enable Hook'));
  console.log('');

  const choices = hooks
    .map((hook, index) => ({
      hook,
      index,
      choice: `[${index + 1}] ${hook.event} - ${hook.command.substring(0, 50)}`,
    }))
    .filter((item) => !item.hook.enabled)
    .map((item) => item.choice);

  choices.push('Cancel');

  const selected = await select('Select hook to enable:', choices);

  if (selected === 'Cancel') {
    displayInfo('Cancelled');
    return;
  }

  const index = parseInt(selected.match(/\[(\d+)\]/)?.[1] || '0') - 1;
  await toggleHook(index, true);

  displaySuccess('Hook enabled successfully');
}

/**
 * Disable a hook
 */
async function disableHookCmd(): Promise<void> {
  const hooks = await listHooks();
  const enabledHooks = hooks.filter((h) => h.enabled);

  if (enabledHooks.length === 0) {
    displayInfo('No enabled hooks');
    return;
  }

  console.log('');
  console.log(colors.primary('✗ Disable Hook'));
  console.log('');

  const choices = hooks
    .map((hook, index) => ({
      hook,
      index,
      choice: `[${index + 1}] ${hook.event} - ${hook.command.substring(0, 50)}`,
    }))
    .filter((item) => item.hook.enabled)
    .map((item) => item.choice);

  choices.push('Cancel');

  const selected = await select('Select hook to disable:', choices);

  if (selected === 'Cancel') {
    displayInfo('Cancelled');
    return;
  }

  const index = parseInt(selected.match(/\[(\d+)\]/)?.[1] || '0') - 1;
  await toggleHook(index, false);

  displaySuccess('Hook disabled successfully');
}

/**
 * Show example hooks
 */
async function showExamplesCmd(): Promise<void> {
  const examples = getDefaultHooks();

  console.log('');
  console.log(colors.primary('📚 Example Hooks'));
  console.log('');

  examples.forEach((example, index) => {
    console.log(`${colors.brand.primary(`[${index + 1}]`)} ${example.description}`);
    console.log(`    ${colors.secondary('Event:')} ${example.event}`);
    console.log(`    ${colors.secondary('Command:')} ${colors.tertiary(example.command)}`);
    console.log('');
  });

  console.log(colors.secondary('💡 Tips:'));
  console.log(colors.tertiary('  - Use ${event} for event name'));
  console.log(colors.tertiary('  - Use ${toolName} for tool name (tool events only)'));
  console.log(colors.tertiary('  - Use ${message} for message content'));
  console.log(colors.tertiary('  - Use ${sessionId} for session ID'));
  console.log('');
}
