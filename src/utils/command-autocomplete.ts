/**
 * Command autocomplete for REPL
 * Shows matching commands with real-time filtering and keyboard navigation
 */

import readline from 'readline';
import { colors } from '../ui/colors.js';

export interface CommandDefinition {
  command: string;
  description: string;
  usage?: string;
  category: string;
}

/**
 * All available REPL commands
 */
export const REPL_COMMANDS: CommandDefinition[] = [
  // Session Management
  { command: '/new', description: 'Start new conversation', category: 'Session' },
  { command: '/clear', description: 'Clear history', category: 'Session' },
  { command: '/save', description: 'Save session', usage: '/save [name]', category: 'Session' },
  { command: '/load', description: 'Load session', usage: '/load <id>', category: 'Session' },
  { command: '/exit', description: 'Exit chat', category: 'Session' },
  { command: '/quit', description: 'Exit chat', category: 'Session' },

  // Tools & Operations
  { command: '/tools', description: 'List all tools', category: 'Tools' },
  { command: '/stats', description: 'Tool usage stats', category: 'Tools' },

  // Snapshots & Undo
  { command: '/undo', description: 'Undo last change', category: 'Snapshots' },
  { command: '/snapshots', description: 'List snapshots', category: 'Snapshots' },
  { command: '/history', description: 'List snapshots (alias)', category: 'Snapshots' },
  { command: '/diff', description: 'Show differences', usage: '/diff <id> [previous-id]', category: 'Snapshots' },
  { command: '/revert', description: 'Revert to snapshot', usage: '/revert <id>', category: 'Snapshots' },
  { command: '/cleanup', description: 'Clean old snapshots', category: 'Snapshots' },

  // Templates & Export
  { command: '/template', description: 'Use prompt template', usage: '/template <name> [key=value...]', category: 'Templates' },
  { command: '/export', description: 'Export conversation', usage: '/export [format] [filename]', category: 'Export' },

  // Planning
  { command: '/plan', description: 'Create implementation plan', usage: '/plan <task-description>', category: 'Planning' },
  { command: '/plans', description: 'List all plans', category: 'Planning' },

  // Codebase Indexing
  { command: '/index', description: 'Manage codebase index', usage: '/index build|rebuild|stats', category: 'Indexing' },
  { command: '/search', description: 'Search for symbols', usage: '/search <name> [--type function|class]', category: 'Indexing' },

  // Testing
  { command: '/test', description: 'Run tests with AI analysis', category: 'Testing' },

  // Git Workflow
  { command: '/commit', description: 'Generate commit message', usage: '/commit [conventional|simple]', category: 'Git' },
  { command: '/review', description: 'Review staged changes', category: 'Git' },

  // Prompt Library
  { command: '/snippet', description: 'Manage prompt snippets', usage: '/snippet save|list|use|delete|search', category: 'Prompts' },

  // Context Management
  { command: '/context', description: 'Manage conversation context', usage: '/context include|exclude|budget|stats|reset', category: 'Context' },

  // Conversation Branching
  { command: '/branch', description: 'Manage conversation branches', usage: '/branch create|list|switch|delete', category: 'Branching' },

  // Other
  { command: '/help', description: 'Show help', category: 'Help' },
  { command: '/models', description: 'List models', category: 'Models' },
];

/**
 * Filter commands by search term
 */
export function filterCommands(searchTerm: string): CommandDefinition[] {
  if (!searchTerm || searchTerm === '/') {
    return REPL_COMMANDS;
  }

  const term = searchTerm.toLowerCase();
  return REPL_COMMANDS.filter(cmd =>
    cmd.command.toLowerCase().startsWith(term) ||
    cmd.description.toLowerCase().includes(term.slice(1)) // Remove leading '/'
  );
}

/**
 * Show command autocomplete with keyboard navigation
 */
export async function showCommandAutocomplete(
  currentInput: string
): Promise<string | null> {
  return new Promise((resolve) => {
    let searchTerm = currentInput;
    let selectedIndex = 0;
    const { stdin, stdout } = process;

    // Check if stdin is a TTY
    if (!stdin.isTTY) {
      // Fallback: just return null
      resolve(null);
      return;
    }

    // Raw mode should already be enabled by the parent readline interface
    // We just need to add our own keypress listener
    let filteredCommands = filterCommands(searchTerm);
    let lastRenderHeight = 0;

    const render = () => {
      // Clear previous render
      if (lastRenderHeight > 0) {
        // Move to start of display
        stdout.write('\r');
        // Clear all lines from previous render
        for (let i = 0; i < lastRenderHeight; i++) {
          stdout.write('\x1B[K'); // Clear line
          if (i < lastRenderHeight - 1) {
            stdout.write('\x1B[B'); // Move down
          }
        }
        // Move back to top
        stdout.write(`\x1B[${lastRenderHeight - 1}A`);
        stdout.write('\r');
      }

      // Calculate how many lines we'll render
      let renderHeight = 1; // Input line

      // Show current input
      stdout.write('\r\x1B[K'); // Clear current line first
      stdout.write(colors.tertiary('You: ') + searchTerm);

      // Show autocomplete dropdown if we have matches
      if (filteredCommands.length > 0) {
        stdout.write('\n\n');
        renderHeight += 2;

        stdout.write(colors.dim('Commands (use ↑↓ to navigate, Tab/Enter to select, Esc to cancel):\n'));
        renderHeight += 1;

        const maxShow = Math.min(filteredCommands.length, 8); // Show max 8 commands
        for (let i = 0; i < maxShow; i++) {
          const cmd = filteredCommands[i]!;
          const isSelected = i === selectedIndex;
          const prefix = isSelected ? colors.brand.primary('❯ ') : '  ';
          const cmdText = isSelected ? colors.secondary(cmd.command) : colors.dim(cmd.command);
          const descText = colors.dim(` - ${cmd.description}`);
          const usageText = cmd.usage && isSelected ? colors.dim(`\n    ${cmd.usage}`) : '';

          stdout.write(`${prefix}${cmdText}${descText}${usageText}\n`);
          renderHeight += 1;
          if (usageText) renderHeight += 1; // Usage adds extra line
        }

        if (filteredCommands.length > maxShow) {
          stdout.write(colors.dim(`  ... and ${filteredCommands.length - maxShow} more\n`));
          renderHeight += 1;
        }
      } else {
        stdout.write('\n\n');
        stdout.write(colors.dim('No matching commands\n'));
        renderHeight += 3;
      }

      // Save height for next render
      lastRenderHeight = renderHeight;

      // Move cursor back to end of input line
      stdout.write(`\x1B[${renderHeight - 1}A`); // Move up to input line
      stdout.write(`\r\x1B[${('You: ' + searchTerm).length}C`); // Move to end of input
    };

    const cleanup = () => {
      // Remove only our keypress listener, not all of them
      stdin.off('keypress', onKeypress);

      // Properly clear all lines from last render
      if (lastRenderHeight > 0) {
        stdout.write('\r');
        for (let i = 0; i < lastRenderHeight; i++) {
          stdout.write('\x1B[K'); // Clear line
          if (i < lastRenderHeight - 1) {
            stdout.write('\x1B[B'); // Move down
          }
        }
        // Move back to top
        stdout.write(`\x1B[${lastRenderHeight - 1}A`);
        stdout.write('\r\x1B[K'); // Clear the input line too
      }
    };

    // Initial render
    render();

    const onKeypress = (_chunk: unknown, key: readline.Key) => {
      if (!key) return;

      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredCommands.length - 1;
        render();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < filteredCommands.length - 1 ? selectedIndex + 1 : 0;
        render();
      } else if (key.name === 'tab' || key.name === 'return') {
        // Select current command
        cleanup();
        if (filteredCommands.length > 0) {
          const selected = filteredCommands[selectedIndex];
          if (selected) {
            resolve(selected.command);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      } else if (key.name === 'escape') {
        // Cancel
        cleanup();
        resolve(null);
      } else if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      } else if (key.name === 'backspace') {
        // Remove last character
        if (searchTerm.length > 0) {
          searchTerm = searchTerm.slice(0, -1);
          if (searchTerm.length === 0) {
            // If empty, cancel autocomplete
            cleanup();
            resolve(null);
            return;
          }
          filteredCommands = filterCommands(searchTerm);
          selectedIndex = 0;
          render();
        } else {
          cleanup();
          resolve(null);
        }
      } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        // Add character to search term
        searchTerm += key.sequence;
        filteredCommands = filterCommands(searchTerm);
        selectedIndex = 0;
        render();
      }
    };

    stdin.on('keypress', onKeypress);
  });
}
