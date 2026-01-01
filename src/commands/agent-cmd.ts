/**
 * Agent command - Manage specialized AI agents
 */

import { listAgents, loadAgent, saveAgent, deleteAgent } from '../agents/manager.js';
import { autoGenerateAgent, createAgentTemplate } from '../agents/creator.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';
import { selectWithKeyboard } from '../utils/keyboard.js';
import { prompt } from '../utils/prompt.js';
import { getEffectiveConfig } from '../config/index.js';
import type { AgentCreateParams } from '../types/agent.js';

export type AgentCommandType = 'list' | 'create' | 'show' | 'delete' | 'edit';

/**
 * Main agent command handler
 */
export async function agentCommand(command: AgentCommandType, args: string[]): Promise<void> {
  switch (command) {
    case 'list':
      await listAgentsCmd();
      break;

    case 'create':
      await createAgentCmd();
      break;

    case 'show':
      if (args.length === 0) {
        displayError('Usage: ollama-cli agent show <name>');
        return;
      }
      await showAgentCmd(args[0]!);
      break;

    case 'delete':
      if (args.length === 0) {
        displayError('Usage: ollama-cli agent delete <name>');
        return;
      }
      await deleteAgentCmd(args[0]!);
      break;

    case 'edit':
      if (args.length === 0) {
        displayError('Usage: ollama-cli agent edit <name>');
        return;
      }
      await editAgentCmd(args[0]!);
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: list, create, show, delete, edit');
  }
}

/**
 * List all agents
 */
async function listAgentsCmd(): Promise<void> {
  const agents = await listAgents();

  if (agents.length === 0) {
    displayInfo('No agents found');
    console.log('');
    console.log(colors.tertiary('Create your first agent with:'));
    console.log(colors.secondary('  ollama-cli agent create'));
    console.log('');
    return;
  }

  console.log('');
  console.log(gradients.brand('Available Agents'));
  console.log('');

  // Group by type
  const global = agents.filter(a => a.type === 'global');
  const project = agents.filter(a => a.type === 'project');

  if (global.length > 0) {
    console.log(colors.secondary('Global Agents:'));
    for (const agent of global) {
      const framework = agent.framework ? colors.dim(` [${agent.framework}]`) : '';
      console.log(`  ${colors.brand.primary('•')} ${colors.secondary(agent.name)}${framework}`);
      console.log(`    ${colors.dim(agent.description)}`);
    }
    console.log('');
  }

  if (project.length > 0) {
    console.log(colors.secondary('Project Agents:'));
    for (const agent of project) {
      const framework = agent.framework ? colors.dim(` [${agent.framework}]`) : '';
      console.log(`  ${colors.brand.primary('•')} ${colors.secondary(agent.name)}${framework}`);
      console.log(`    ${colors.dim(agent.description)}`);
    }
    console.log('');
  }

  console.log(colors.tertiary(`Use agent: ollama-cli chat --agent <name>`));
  console.log('');
}

/**
 * Create new agent
 */
async function createAgentCmd(): Promise<void> {
  console.log('');
  console.log(gradients.brand('Create New Agent'));
  console.log('');

  // Get basic info
  const name = await prompt('Agent name (e.g., laravel-developer)');
  if (!name) {
    displayError('Agent name is required');
    return;
  }

  const description = await prompt('Description (e.g., Laravel development expert)');
  if (!description) {
    displayError('Description is required');
    return;
  }

  const framework = await prompt('Framework (optional, e.g., laravel, react, django)');
  const language = await prompt('Programming language (optional, e.g., php, javascript, python)');

  // Choose creation method
  const method = await selectWithKeyboard(
    'How would you like to create this agent?',
    [
      { label: 'Auto-generate using AI', value: 'auto', description: 'AI creates the full definition' },
      { label: 'Manual template', value: 'manual', description: 'Start with a template to edit' },
    ],
    { cancelable: true }
  );

  if (!method) {
    console.log('Cancelled');
    return;
  }

  // Choose scope
  const scope = await selectWithKeyboard(
    'Where should this agent be saved?',
    [
      { label: 'Global', value: 'global', description: 'Available in all projects' },
      { label: 'Project', value: 'project', description: 'Only for current project' },
    ]
  );

  if (!scope || (scope !== 'global' && scope !== 'project')) {
    console.log('Cancelled');
    return;
  }

  const params: AgentCreateParams = {
    name,
    description,
    framework: framework || undefined,
    language: language || undefined,
    auto: method === 'auto',
    scope,
  };

  // Generate or create template
  let definition;

  if (params.auto) {
    startSpinner('Generating agent definition with AI...');

    try {
      const config = await getEffectiveConfig();
      definition = await autoGenerateAgent(params, config.baseUrl);
      stopSpinner();
      displaySuccess('Agent definition generated!');
    } catch (error) {
      stopSpinner();
      displayError(error instanceof Error ? error.message : 'Failed to generate agent');
      return;
    }
  } else {
    definition = createAgentTemplate(params);
    displayInfo('Agent template created');
  }

  // Save agent
  try {
    const filePath = await saveAgent(definition, scope);
    console.log('');
    displaySuccess(`Agent saved: ${filePath}`);
    console.log('');

    if (!params.auto) {
      console.log(colors.tertiary('Edit the agent file to customize:'));
      console.log(colors.secondary(`  ${filePath}`));
      console.log('');
    }

    console.log(colors.tertiary('Use this agent with:'));
    console.log(colors.secondary(`  ollama-cli chat --agent ${name}`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to save agent');
  }
}

/**
 * Show agent details
 */
async function showAgentCmd(name: string): Promise<void> {
  const agent = await loadAgent(name);

  if (!agent) {
    displayError(`Agent not found: ${name}`);
    return;
  }

  console.log('');
  console.log(gradients.brand(agent.definition.metadata.name));
  console.log('');
  console.log(colors.secondary('Description:'));
  console.log(`  ${colors.tertiary(agent.definition.metadata.description)}`);
  console.log('');

  if (agent.definition.metadata.framework) {
    console.log(colors.secondary(`Framework: ${colors.tertiary(agent.definition.metadata.framework)}`));
  }

  if (agent.definition.metadata.language) {
    console.log(colors.secondary(`Language: ${colors.tertiary(agent.definition.metadata.language)}`));
  }

  console.log(colors.dim(`Type: ${agent.type}`));
  console.log(colors.dim(`Version: ${agent.definition.metadata.version}`));
  console.log('');

  console.log(colors.secondary('Capabilities:'));
  agent.definition.capabilities.forEach(cap => {
    console.log(`  ${colors.brand.primary('•')} ${colors.tertiary(cap)}`);
  });
  console.log('');

  console.log(colors.secondary('Tools:'));
  agent.definition.tools.forEach(tool => {
    console.log(`  ${colors.brand.primary('•')} ${colors.tertiary(tool)}`);
  });
  console.log('');

  console.log(colors.dim(`File: ${agent.path}`));
  console.log('');
}

/**
 * Delete agent
 */
async function deleteAgentCmd(name: string): Promise<void> {
  // Find agent to determine scope
  const agent = await loadAgent(name);

  if (!agent) {
    displayError(`Agent not found: ${name}`);
    return;
  }

  // Confirm deletion
  const confirmed = await selectWithKeyboard(
    `Delete agent "${name}"?`,
    [
      { label: 'Yes, delete it', value: 'yes' },
      { label: 'No, cancel', value: 'no' },
    ]
  );

  if (confirmed !== 'yes') {
    console.log('Cancelled');
    return;
  }

  const success = await deleteAgent(name, agent.type);

  if (success) {
    displaySuccess(`Agent "${name}" deleted`);
  } else {
    displayError('Failed to delete agent');
  }
}

/**
 * Edit agent
 */
async function editAgentCmd(name: string): Promise<void> {
  const agent = await loadAgent(name);

  if (!agent) {
    displayError(`Agent not found: ${name}`);
    return;
  }

  console.log('');
  console.log(colors.tertiary(`Opening agent file for editing:`));
  console.log(colors.secondary(agent.path));
  console.log('');
  console.log(colors.dim('Edit the file manually and save your changes'));
  console.log('');

  // On macOS/Linux, try to open in default editor
  try {
    const editor = process.env.EDITOR || 'nano';
    const { exec } = await import('child_process');
    exec(`${editor} "${agent.path}"`, (error) => {
      if (error) {
        console.log(colors.warning(`Couldn't open editor. Edit manually: ${agent.path}`));
      }
    });
  } catch {
    // Just show the path if we can't open
  }
}
