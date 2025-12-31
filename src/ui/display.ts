/**
 * Terminal UI utilities
 * Handles formatting, colors, and visual output
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import type { Model } from '../types/index.js';
import { gradients, colors, symbols } from './colors.js';

/**
 * Format file size to human-readable format
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex] ?? 'B'}`;
}

/**
 * Format date to relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

/**
 * Display models in a formatted table
 */
export function displayModels(models: Model[]): void {
  if (models.length === 0) {
    console.log('');
    displayWarning('No models found. Pull a model with: ollama pull <model-name>');
    return;
  }

  const table = new Table({
    head: [
      colors.brand.primary('NAME'),
      colors.brand.primary('SIZE'),
      colors.brand.primary('MODIFIED')
    ],
    style: {
      head: [],
      border: ['dim'],
      compact: true,
    },
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    }
  });

  // Sort by modified date (most recent first)
  const sortedModels = [...models].sort(
    (a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
  );

  for (const model of sortedModels) {
    table.push([
      colors.primary(model.name),
      colors.secondary(formatBytes(model.size)),
      colors.tertiary(formatRelativeTime(model.modified_at)),
    ]);
  }

  console.log('');
  console.log(table.toString());
  console.log('');
  console.log(colors.dim(`  ${symbols.bullet} ${models.length} model${models.length === 1 ? '' : 's'} available`));
  console.log('');
}

/**
 * Display welcome message for chat
 */
export function displayWelcome(model: string, sessionId?: string): void {
  console.log(chalk.bold.cyan('\nOllama CLI - Interactive Chat'));
  console.log(chalk.grey('─'.repeat(50)));
  console.log(chalk.white(`Model: ${chalk.bold(model)}`));
  if (sessionId) {
    console.log(chalk.white(`Session: ${chalk.bold(sessionId)}`));
  }
  console.log(chalk.grey('\nType /help for commands, /exit to quit'));
  console.log(chalk.grey('─'.repeat(50)) + '\n');
}

/**
 * Helper function to shorten long paths
 */
function shortenPath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;
  const parts = path.split('/');
  if (parts.length <= 3) return path;
  return `.../${parts.slice(-2).join('/')}`;
}

/**
 * Display coding assistant dashboard
 */
export function displayCodingAssistantWelcome(options: {
  model: string;
  sessionId: string;
  toolCount: number;
  workingDir: string;
  assistantName?: string | undefined;
  assistantEmoji?: string | undefined;
}): void {
  const { model, sessionId, toolCount, workingDir, assistantName, assistantEmoji } = options;

  console.clear();
  console.log('');

  // Modern gradient title (no heavy box)
  const title = assistantName
    ? `${assistantEmoji || symbols.robot} ${assistantName}`
    : `${symbols.robot} Coding Assistant`;
  console.log(gradients.brand(title));
  console.log(colors.tertiary('Powered by Ollama'));
  console.log('');

  // Status section - minimalist
  console.log(colors.secondary(`${symbols.circle} Status`));
  console.log('');

  if (assistantName) {
    console.log(`  ${colors.tertiary('Assistant')}   ${colors.brand.primary(`${assistantEmoji || symbols.robot} ${assistantName}`)}`);
  }
  console.log(`  ${colors.tertiary('Model')}       ${colors.brand.primary(model)}`);
  console.log(`  ${colors.tertiary('Directory')}   ${colors.secondary(shortenPath(workingDir, 50))}`);
  console.log(`  ${colors.tertiary('Tools')}       ${colors.success(`${toolCount} available`)}`);
  console.log(`  ${colors.tertiary('Session')}     ${colors.dim(sessionId.substring(0, 8))}${colors.tertiary('...')}`);
  console.log('');

  // Capabilities - compact 2-column layout
  console.log(colors.secondary(`${symbols.circle} Capabilities`));
  console.log('');
  const capabilities = [
    { icon: symbols.book, text: 'Read & analyze code' },
    { icon: symbols.edit, text: 'Write & edit files' },
    { icon: symbols.search, text: 'Search projects' },
    { icon: symbols.git, text: 'Navigate directories' },
    { icon: symbols.command, text: 'Run commands' },
    { icon: symbols.package, text: 'Manage packages' },
    { icon: symbols.web, text: 'Fetch resources' },
    { icon: symbols.snapshot, text: 'Auto-snapshot changes' },
  ];

  // Display in 2 columns
  for (let i = 0; i < capabilities.length; i += 2) {
    const left = capabilities[i];
    const right = capabilities[i + 1];
    const leftText = `${left?.icon}  ${colors.primary(left?.text || '')}`;
    const rightText = right ? `${right.icon}  ${colors.primary(right.text)}` : '';
    console.log(`  ${leftText.padEnd(35)}${rightText}`);
  }
  console.log('');

  // Quick commands - refined
  console.log(colors.secondary(`${symbols.circle} Quick Commands`));
  console.log('');
  console.log(`  ${colors.brand.primary('/tools')}      ${colors.tertiary('List available tools')}`);
  console.log(`  ${colors.brand.primary('/help')}       ${colors.tertiary('Show all commands')}`);
  console.log(`  ${colors.brand.primary('/snapshots')}  ${colors.tertiary('View change history')}`);
  console.log(`  ${colors.brand.primary('/exit')}       ${colors.tertiary('Exit assistant')}`);
  console.log('');

  // Subtle tip (no heavy divider)
  console.log(colors.dim(`  ${symbols.info} Just ask naturally - I'll use tools automatically`));
  console.log('');
}

/**
 * Display help message for chat REPL
 */
export function displayHelp(): void {
  console.log(chalk.bold.cyan('\nAvailable Commands:'));
  console.log(chalk.grey('─'.repeat(50)));
  console.log(chalk.white('  /help              ') + chalk.grey('Show this help message'));
  console.log(chalk.white('  /models            ') + chalk.grey('List available models'));
  console.log(chalk.white('  /clear             ') + chalk.grey('Clear conversation history'));
  console.log(chalk.white('  /save [name]       ') + chalk.grey('Save current session'));
  console.log(chalk.white('  /load <id>         ') + chalk.grey('Load a previous session'));
  console.log(chalk.white('  /exit              ') + chalk.grey('Exit the chat'));
  console.log(chalk.grey('─'.repeat(50)) + '\n');
}

/**
 * Display error message
 */
export function displayError(message: string, suggestion?: string): void {
  console.error('');
  console.error(`${colors.error(`${symbols.error} Error`)} ${colors.primary(message)}`);
  if (suggestion) {
    console.error(`  ${colors.warning(`${symbols.arrowRight}`)} ${colors.secondary(suggestion)}`);
  }
  console.error('');
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  console.log('');
  console.log(`${colors.success(`${symbols.success}`)} ${colors.primary(message)}`);
  console.log('');
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(`${colors.info(`${symbols.info}`)} ${colors.primary(message)}`);
}

/**
 * Display warning message
 */
export function displayWarning(message: string): void {
  console.log(`${colors.warning(`${symbols.warning}`)} ${colors.primary(message)}`);
}

/**
 * Format user message
 */
export function formatUserMessage(content: string): string {
  return chalk.cyan('You: ') + chalk.white(content);
}

/**
 * Format assistant message prefix
 */
export function formatAssistantPrefix(): string {
  return chalk.green('Assistant: ');
}

/**
 * Display user message in a box
 */
export function displayUserMessage(content: string): void {
  console.log('');
  console.log(colors.user(`${symbols.arrowRight} You`));
  const lines = content.split('\n');
  for (const line of lines) {
    console.log(`  ${colors.primary(line)}`);
  }
  console.log('');
}

/**
 * Display assistant message prefix with visual separator
 */
export function displayAssistantMessageStart(assistantName?: string): void {
  const name = assistantName || 'Assistant';
  console.log(colors.assistant(`${symbols.robot} ${name}`));
  process.stdout.write('  '); // Indent for content
}

/**
 * Close assistant message box
 */
export function displayAssistantMessageEnd(): void {
  console.log('');
  console.log(''); // Just breathing room
}

/**
 * Display tool execution start
 */
export function displayToolExecutionStart(toolName: string, parameters: Record<string, unknown>): void {
  console.log('');
  console.log(`  ${colors.tool.border(symbols.verticalBar)}`);
  console.log(`  ${colors.tool.border(symbols.verticalBar)} ${colors.tool.label(`${symbols.tool} ${toolName}`)}`);

  // Show only the most important parameter (usually 1)
  const keyParams = Object.entries(parameters).slice(0, 1);
  for (const [key, value] of keyParams) {
    const displayValue = typeof value === 'string' && value.length > 40
      ? value.substring(0, 40) + '...'
      : String(value);
    console.log(`  ${colors.tool.border(symbols.verticalBar)} ${colors.tool.param(`${key}:`)} ${colors.secondary(displayValue)}`);
  }

  if (Object.keys(parameters).length > 1) {
    console.log(`  ${colors.tool.border(symbols.verticalBar)} ${colors.dim(`+${Object.keys(parameters).length - 1} more`)}`);
  }

  process.stdout.write(`  ${colors.tool.border(symbols.verticalBar)} ${colors.tool.pending(`${symbols.spinner[0]} Running...`)}`);
}

/**
 * Display tool execution success
 */
export function displayToolExecutionSuccess(summary: string, snapshotId?: string): void {
  // Clear the "Running..." line
  console.log(`\r  ${colors.tool.border(symbols.verticalBar)} ${colors.tool.success(`${symbols.success} Done`)}` + ' '.repeat(20));

  // Show condensed summary (max 2 lines)
  const summaryLines = summary.split('\n').slice(0, 2);
  for (const line of summaryLines) {
    if (line.trim()) {
      console.log(`  ${colors.tool.border(symbols.verticalBar)} ${colors.dim(line.substring(0, 60))}`);
    }
  }

  if (snapshotId) {
    console.log(`  ${colors.tool.border(symbols.verticalBar)} ${colors.dim(`${symbols.snapshot} ${snapshotId.substring(0, 8)}...`)}`);
  }

  console.log(`  ${colors.tool.border(symbols.verticalBar)}`);
  console.log('');
}

/**
 * Display tool execution failure
 */
export function displayToolExecutionFailure(error: string): void {
  console.log(`\r  ${colors.tool.border(symbols.verticalBar)} ${colors.error(`${symbols.error} Failed`)}` + ' '.repeat(20));
  console.log(`  ${colors.tool.border(symbols.verticalBar)} ${colors.error(error.substring(0, 80))}`);
  console.log(`  ${colors.tool.border(symbols.verticalBar)}`);
  console.log('');
}

/**
 * Create summary from tool result
 */
export function summarizeToolResult(data: unknown): string {
  if (typeof data === 'string') {
    const lines = data.split('\n');
    if (lines.length > 10) {
      return `${lines.slice(0, 10).join('\n')}\n... (${lines.length - 10} more lines)`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return `Array with ${data.length} item${data.length === 1 ? '' : 's'}`;
  }

  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    if (keys.length === 0) return 'Empty object';

    const preview = keys.slice(0, 3).map(key => {
      const value = (data as Record<string, unknown>)[key];
      const valueStr = typeof value === 'string' && value.length > 30
        ? value.substring(0, 30) + '...'
        : String(value);
      return `  ${key}: ${valueStr}`;
    }).join('\n');

    if (keys.length > 3) {
      return `${preview}\n  ... and ${keys.length - 3} more fields`;
    }
    return preview;
  }

  return String(data);
}

/**
 * Display thinking indicator
 */
export function displayThinking(): void {
  process.stdout.write(colors.dim(`  ${symbols.spinner[0]} Thinking...`));
}

/**
 * Clear thinking indicator
 */
export function clearThinking(): void {
  process.stdout.write('\r' + ' '.repeat(50) + '\r');
}

/**
 * Format streaming text with message box prefix
 * Adds 2-space indent to each new line in streaming output
 */
export function formatStreamingChunk(chunk: string, _isFirstChunk: boolean): string {
  // Simply indent with 2 spaces, no colored bars
  return chunk.replace(/\n/g, '\n  ');
}

/**
 * Display configuration table
 */
export function displayConfig(config: Record<string, string | number>): void {
  const table = new Table({
    head: [colors.brand.primary('KEY'), colors.brand.primary('VALUE')],
    style: {
      head: [],
      border: ['dim'],
      compact: true,
    },
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    }
  });

  for (const [key, value] of Object.entries(config)) {
    table.push([colors.primary(key), colors.secondary(String(value))]);
  }

  console.log('');
  console.log(table.toString());
  console.log('');
}
