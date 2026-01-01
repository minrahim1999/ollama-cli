/**
 * Output Styles System
 * Customizable formatting for LLM responses
 */

import chalk from 'chalk';
import { colors } from '../ui/colors.js';

export type OutputStyle = 'default' | 'minimal' | 'markdown' | 'json';

export interface OutputStyleConfig {
  style: OutputStyle;
  showTimestamps?: boolean | undefined;
  showTokenCount?: boolean | undefined;
  colorize?: boolean | undefined;
}

// Global state
let currentStyle: OutputStyleConfig = {
  style: 'default',
  showTimestamps: false,
  showTokenCount: false,
  colorize: true,
};

/**
 * Get current output style
 */
export function getCurrentStyle(): OutputStyleConfig {
  return { ...currentStyle };
}

/**
 * Set output style
 */
export function setOutputStyle(config: Partial<OutputStyleConfig>): void {
  currentStyle = { ...currentStyle, ...config };
}

/**
 * Format user message based on style
 */
export function formatUserMessage(content: string, style?: OutputStyle): string {
  const s = style || currentStyle.style;

  switch (s) {
    case 'minimal':
      return `User: ${content}\n`;

    case 'markdown':
      return `**User:** ${content}\n`;

    case 'json':
      return JSON.stringify({ role: 'user', content }, null, 2);

    case 'default':
    default:
      // Current box style
      return `${chalk.cyan('╭─ You')}\n${chalk.cyan('│')} ${content}\n${chalk.cyan('╰─')}\n`;
  }
}

/**
 * Format assistant message based on style
 */
export function formatAssistantMessage(content: string, style?: OutputStyle): string {
  const s = style || currentStyle.style;

  switch (s) {
    case 'minimal':
      return `Assistant: ${content}\n`;

    case 'markdown':
      return `**Assistant:** ${content}\n`;

    case 'json':
      return JSON.stringify({ role: 'assistant', content }, null, 2);

    case 'default':
    default:
      // Current box style
      return `${chalk.green('╭─ 🤖 Assistant')}\n${chalk.green('│')} ${content}\n${chalk.green('╰─')}\n`;
  }
}

/**
 * Format tool execution based on style
 */
export function formatToolExecution(
  toolName: string,
  params: Record<string, unknown>,
  result: string,
  success: boolean,
  style?: OutputStyle
): string {
  const s = style || currentStyle.style;

  switch (s) {
    case 'minimal':
      return `Tool ${toolName}: ${success ? 'Success' : 'Failed'}\n`;

    case 'markdown':
      return `**Tool \`${toolName}\`:** ${success ? '✓ Success' : '✗ Failed'}\n`;

    case 'json':
      return JSON.stringify(
        {
          tool: toolName,
          params,
          success,
          result: result.substring(0, 200),
        },
        null,
        2
      );

    case 'default':
    default:
      // Current indented style
      const icon = success ? '✓' : '✗';
      return `  ${chalk.blue(`┌─ 🔧 Tool: ${toolName}`)}\n  ${chalk.blue(`│ ${icon} ${success ? 'Success' : 'Failed'}`)}\n  ${chalk.blue('└─')}\n`;
  }
}

/**
 * Format error message based on style
 */
export function formatError(message: string, style?: OutputStyle): string {
  const s = style || currentStyle.style;

  switch (s) {
    case 'minimal':
      return `Error: ${message}\n`;

    case 'markdown':
      return `**Error:** ${message}\n`;

    case 'json':
      return JSON.stringify({ error: message }, null, 2);

    case 'default':
    default:
      return chalk.red(`✗ Error: ${message}\n`);
  }
}

/**
 * Format info message based on style
 */
export function formatInfo(message: string, style?: OutputStyle): string {
  const s = style || currentStyle.style;

  switch (s) {
    case 'minimal':
    case 'markdown':
      return `${message}\n`;

    case 'json':
      return JSON.stringify({ info: message }, null, 2);

    case 'default':
    default:
      return chalk.cyan(`ℹ ${message}\n`);
  }
}

/**
 * Format success message based on style
 */
export function formatSuccess(message: string, style?: OutputStyle): string {
  const s = style || currentStyle.style;

  switch (s) {
    case 'minimal':
    case 'markdown':
      return `${message}\n`;

    case 'json':
      return JSON.stringify({ success: message }, null, 2);

    case 'default':
    default:
      return chalk.green(`✓ ${message}\n`);
  }
}

/**
 * Format with timestamp if enabled
 */
export function withTimestamp(content: string): string {
  if (!currentStyle.showTimestamps) {
    return content;
  }

  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] ${content}`;
}

/**
 * Format with token count if enabled
 */
export function withTokenCount(content: string, tokens: number): string {
  if (!currentStyle.showTokenCount) {
    return content;
  }

  return `${content}\n${colors.tertiary(`Tokens: ${tokens}`)}`;
}

/**
 * Cycle through output styles
 */
export function cycleOutputStyle(): OutputStyle {
  const styles: OutputStyle[] = ['default', 'minimal', 'markdown', 'json'];
  const currentIndex = styles.indexOf(currentStyle.style);
  const nextIndex = (currentIndex + 1) % styles.length;
  const nextStyle = styles[nextIndex]!;

  currentStyle.style = nextStyle;
  return nextStyle;
}

/**
 * Get style description
 */
export function getStyleDescription(style: OutputStyle): string {
  switch (style) {
    case 'default':
      return 'Default - Formatted with boxes and colors';
    case 'minimal':
      return 'Minimal - Plain text output';
    case 'markdown':
      return 'Markdown - Clean markdown formatting';
    case 'json':
      return 'JSON - Structured JSON output';
  }
}

/**
 * Reset to default style
 */
export function resetOutputStyle(): void {
  currentStyle = {
    style: 'default',
    showTimestamps: false,
    showTokenCount: false,
    colorize: true,
  };
}
