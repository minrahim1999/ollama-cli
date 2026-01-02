#!/usr/bin/env node

/**
 * Main CLI entry point
 * Parses commands and routes to appropriate handlers
 */

import { Command } from 'commander';
import { chatCommand } from './commands/chat.js';
import { chatCommandEnhanced } from './commands/chat-enhanced.js';
import { askCommand } from './commands/ask.js';
import { compareCommand } from './commands/compare.js';
import { modelsCommand } from './commands/models.js';
import { configCommand } from './commands/config.js';
import { assistantCommand } from './commands/assistant.js';
import { initCommand } from './commands/init.js';
import { writeCommand } from './commands/write.js';
import { templateCommand } from './commands/template.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { gitCommand } from './commands/git.js';
import { planCommand } from './commands/plan.js';
import { indexCommand } from './commands/index-cmd.js';
import { workflowCommand } from './commands/workflow.js';
import { databaseCommand } from './commands/database.js';
import { ragCommand } from './commands/rag.js';
import { apiCommand } from './commands/api.js';
import { setupCommand } from './commands/setup.js';
import { agentCommand } from './commands/agent-cmd.js';
import { headlessCommand } from './commands/headless.js';
import { hooksCommand } from './commands/hooks.js';
import { skillsCommand } from './commands/skills.js';
import { analyticsCommand } from './commands/analytics.js';
import { generateCommand } from './commands/generate.js';
import { isSetupComplete, runSetup, verifyModels } from './setup/index.js';

const program = new Command();

/**
 * Ensure setup is complete before running commands
 */
async function ensureSetup(): Promise<boolean> {
  const setupComplete = await isSetupComplete();
  if (!setupComplete) {
    const success = await runSetup();
    if (!success) {
      return false;
    }
    console.log('');
    return true;
  } else {
    // Verify models periodically
    return await verifyModels();
  }
}

program
  .name('ollama-cli')
  .description('AI Coding Assistant powered by Ollama')
  .version('2.3.0')
  .option('-m, --model <model>', 'Model to use')
  .option('-s, --session <id>', 'Resume a specific session')
  .option('-a, --assistant <id>', 'Use specific assistant')
  .option('--agent <name>', 'Use specialized agent (e.g., laravel-developer)')
  .option('--working-dir <path>', 'Working directory for tools (default: current)')
  .option('--skip-setup', 'Skip setup verification')
  .action(async (options) => {
    // Check setup on first run
    if (!options.skipSetup) {
      const setupComplete = await isSetupComplete();
      if (!setupComplete) {
        const success = await runSetup();
        if (!success) {
          process.exit(1);
        }
        console.log('');
      } else {
        // Verify models periodically
        const modelsValid = await verifyModels();
        if (!modelsValid) {
          process.exit(1);
        }
      }
    }

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
  .option('--agent <name>', 'Use specialized agent (e.g., laravel-developer)')
  .option('--system <message>', 'Set system prompt')
  .option('--tools', 'Enable MCP tools (read, write, bash, etc.)')
  .option('--working-dir <path>', 'Working directory for tools (default: current)')
  .option('--skip-setup', 'Skip setup verification')
  .action(async (options) => {
    // Verify setup before starting chat
    if (!options.skipSetup && !(await ensureSetup())) {
      process.exit(1);
    }

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
  .option('--skip-setup', 'Skip setup verification')
  .action(async (prompt, options) => {
    // Verify setup before asking
    if (!options.skipSetup && !(await ensureSetup())) {
      process.exit(1);
    }

    await askCommand(prompt, options);
  });

// Compare command
program
  .command('compare <prompt>')
  .description('Compare responses from multiple models')
  .option('--models <models>', 'Comma-separated list of models (e.g., "llama3.1,mistral,codellama")')
  .option('--system <message>', 'Set system prompt')
  .option('--skip-setup', 'Skip setup verification')
  .action(async (prompt, options) => {
    // Verify setup before comparing
    if (!options.skipSetup && !(await ensureSetup())) {
      process.exit(1);
    }

    await compareCommand(prompt, options);
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

// Template command
program
  .command('template <command> [args...]')
  .description('Manage prompt templates')
  .option('-c, --category <category>', 'Filter by category (code|documentation|git|general)')
  .action(async (command, args, options) => {
    await templateCommand(command, args, options);
  });

// Export command
program
  .command('export <session-id>')
  .description('Export conversation to file')
  .option('-f, --format <format>', 'Export format (json|markdown|txt)', 'markdown')
  .option('-o, --output <path>', 'Output file path')
  .option('--pretty', 'Pretty print JSON')
  .action(async (sessionId, options) => {
    await exportCommand(sessionId, options);
  });

// Import command
program
  .command('import <file>')
  .description('Import conversation from file')
  .option('-n, --name <name>', 'Session name')
  .option('-f, --format <format>', 'File format (json|markdown)')
  .action(async (file, options) => {
    await importCommand(file, options);
  });

// Git command
program
  .command('git <command>')
  .description('Git workflow helpers')
  .option('-m, --model <model>', 'Model to use')
  .option('--style <style>', 'Commit message style (conventional|simple)', 'conventional')
  .option('--auto-commit', 'Auto-commit after generating message')
  .option('--base <branch>', 'Base branch for PR (default: main)')
  .action(async (command, options) => {
    await gitCommand(command, options);
  });

// Plan command
program
  .command('plan <command> [args...]')
  .description('Manage execution plans')
  .action(async (command, args) => {
    await planCommand(command, args);
  });

// Index command
program
  .command('index <command> [args...]')
  .description('Manage codebase index (build|rebuild|stats|clear)')
  .action(async (command, args) => {
    await indexCommand(command, args);
  });

// Workflow command
program
  .command('workflow <command> [args...]')
  .description('Manage and execute workflows (run|list|show)')
  .action(async (command, args) => {
    await workflowCommand(command, args);
  });

// Database command
program
  .command('database <command> [args...]')
  .description('SQL execution and schema inspection (query|schema|tables|describe)')
  .option('--file <path>', 'Database file path (default: ./database.db)')
  .option('--table <name>', 'Table name for describe command')
  .action(async (command, args, options) => {
    await databaseCommand(command, args, options);
  });

// RAG command
program
  .command('rag <command> [args...]')
  .description('Vector embeddings and context retrieval (add|search|index|stats|clear)')
  .option('--file <path>', 'File to add to vector store')
  .option('--type <type>', 'Document type (code|documentation|text)')
  .option('--language <lang>', 'Programming language')
  .option('--model <model>', 'Embedding model (default: nomic-embed-text)')
  .option('--topk <n>', 'Number of results (default: 5)', parseInt)
  .option('--min-score <n>', 'Minimum similarity score (default: 0.5)', parseFloat)
  .action(async (command, args, options) => {
    await ragCommand(command, args, options);
  });

// API command
program
  .command('api <command> [args...]')
  .description('HTTP client and API testing (request|test)')
  .option('--method <method>', 'HTTP method (GET|POST|PUT|PATCH|DELETE)', 'GET')
  .option('--header <header>', 'HTTP header (can be used multiple times)', (value, previous: string[] = []) => [...previous, value], [])
  .option('--data <data>', 'Request body (JSON string or raw data)')
  .option('--file <path>', 'Test file path (for test command)')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .action(async (command, args, options) => {
    await apiCommand(command, args, options);
  });

// Setup command
program
  .command('setup <command>')
  .description('Manage first-run setup and model verification (init|reset|status)')
  .action(async (command) => {
    await setupCommand(command);
  });

// Agent command
program
  .command('agent <command> [args...]')
  .description('Manage specialized AI agents (list|create|show|delete|edit)')
  .action(async (command, args) => {
    await agentCommand(command, args);
  });

// Headless command (non-interactive)
program
  .command('headless [prompt]')
  .description('Non-interactive execution for CI/CD pipelines')
  .option('-m, --model <model>', 'Model to use')
  .option('--base-url <url>', 'Ollama base URL')
  .option('--system <prompt>', 'System prompt')
  .option('--temperature <value>', 'Temperature (0.0-1.0)', parseFloat)
  .option('--format <format>', 'Output format (json|text)', 'text')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .option('--file <path>', 'Read prompt from file')
  .option('--batch', 'Batch mode: process multiple prompts (one per line)')
  .action(async (prompt, options) => {
    await headlessCommand(prompt, options);
  });

// Hooks command
program
  .command('hooks <command>')
  .description('Manage event-driven automation (list|add|remove|enable|disable|examples)')
  .action(async (command) => {
    await hooksCommand(command);
  });

// Skills command
program
  .command('skills <command> [args...]')
  .description('AI capability discovery (list|popular|stats|suggest)')
  .action(async (command, args) => {
    await skillsCommand(command, args);
  });

// Analytics command
program
  .command('analytics <command> [args...]')
  .description('Usage analytics and insights (overview|tools|session|clear)')
  .action(async (command, args) => {
    await analyticsCommand(command, args);
  });

// Generate command
program
  .command('generate <command> [args...]')
  .description('Code generation from templates (list|api|auth|crud|model|test|component)')
  .option('--framework <framework>', 'Target framework (express, react, django, etc.)')
  .option('--language <language>', 'Programming language (typescript, javascript, python, php)')
  .option('--output <path>', 'Output directory')
  .action(async (command, args, options) => {
    await generateCommand(command, args, options);
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
