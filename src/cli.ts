#!/usr/bin/env node

/**
 * Main CLI entry point
 * Parses commands and routes to appropriate handlers
 */

import { Command } from 'commander';
import { chatCommand } from './commands/chat.js';
import { chatCommandEnhanced } from './commands/chat-enhanced.js';
import { askCommand } from './commands/ask.js';
import { modelsCommand } from './commands/models.js';
import { configCommand } from './commands/config.js';
import { assistantCommand } from './commands/assistant.js';
import { initCommand } from './commands/init.js';
import { writeCommand } from './commands/write.js';

const program = new Command();

program
  .name('ollama-cli')
  .description('AI Coding Assistant powered by Ollama')
  .version('1.0.0')
  .option('-m, --model <model>', 'Model to use')
  .option('-s, --session <id>', 'Resume a specific session')
  .option('-a, --assistant <id>', 'Use specific assistant')
  .option('--working-dir <path>', 'Working directory for tools (default: current)')
  .action(async (options) => {
    // Default action: start coding assistant with tools enabled
    await chatCommandEnhanced({
      ...options,
      tools: true,
    });
  });

// Chat command
program
  .command('chat')
  .description('Start an interactive chat session')
  .option('-m, --model <model>', 'Model to use')
  .option('-s, --session <id>', 'Resume a specific session')
  .option('-a, --assistant <id>', 'Use specific assistant')
  .option('--system <message>', 'Set system prompt')
  .option('--tools', 'Enable MCP tools (read, write, bash, etc.)')
  .option('--working-dir <path>', 'Working directory for tools (default: current)')
  .action(async (options) => {
    if (options.tools || options.assistant) {
      await chatCommandEnhanced(options);
    } else {
      await chatCommand(options);
    }
  });

// Ask command
program
  .command('ask <prompt>')
  .description('Get a one-shot response')
  .option('-m, --model <model>', 'Model to use')
  .option('--json <schema>', 'Generate JSON matching the schema file')
  .option('--raw', 'Output raw response without formatting')
  .option('--system <message>', 'Set system prompt')
  .action(async (prompt, options) => {
    await askCommand(prompt, options);
  });

// Models command
program
  .command('models')
  .description('List available Ollama models')
  .action(async () => {
    await modelsCommand();
  });

// Config command
program
  .command('config <command> [key] [value]')
  .description('Manage CLI configuration')
  .action(async (command, key, value) => {
    await configCommand(command, key, value);
  });

// Assistant command
program
  .command('assistant <command> [args...]')
  .description('Manage AI assistants')
  .action(async (command, args) => {
    await assistantCommand(command, ...args);
  });

// Init command
program
  .command('init [path]')
  .description('Initialize project with .ollama directory and PROJECT.md')
  .action(async (projectPath) => {
    await initCommand(projectPath);
  });

// Write command (file operations mode)
program
  .command('write')
  .description('Start write mode - specialized for creating/editing files')
  .option('-m, --model <model>', 'Model to use')
  .option('-s, --session <id>', 'Resume a specific session')
  .option('--working-dir <path>', 'Working directory (default: current)')
  .action(async (options) => {
    await writeCommand(options);
  });

// Parse arguments
program.parse();
