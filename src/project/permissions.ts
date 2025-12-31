/**
 * Project permissions helper
 * Handles first-time permission prompts
 */

import chalk from 'chalk';
import readline from 'readline/promises';
import { initializeProject, detectProjectContext } from './index.js';
import type { ProjectPermissions } from '../types/project.js';

/**
 * Prompt user for project permissions
 */
export async function promptForPermissions(projectPath: string): Promise<boolean> {
  console.log('');
  console.log(chalk.bold.yellow('  📁 Project Not Initialized'));
  console.log(chalk.grey('  ──────────────────────────────────────────────────────────────'));
  console.log('');
  console.log(chalk.white(`  This project hasn't been initialized with Ollama CLI.`));
  console.log(chalk.grey(`  Location: ${projectPath}`));
  console.log('');
  console.log(chalk.white('  To provide better assistance, I need permission to:'));
  console.log(chalk.grey('  • Read files in this project'));
  console.log(chalk.grey('  • Write/edit files (with your approval)'));
  console.log(chalk.grey('  • Execute commands (with your approval)'));
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const initAnswer = await rl.question(
      chalk.cyan('  Initialize this project now? (Y/n): ')
    );

    if (initAnswer.toLowerCase() === 'n') {
      console.log('');
      console.log(chalk.grey('  Continuing without project context...'));
      console.log(chalk.grey('  Run "ollama-cli init" later to set up the project'));
      console.log('');
      return false;
    }

    console.log('');
    console.log(chalk.bold.white('  Grant Permissions'));
    console.log(chalk.grey('  ──────────────────────────────────────────────────────────────'));
    console.log('');

    const readAnswer = await rl.question(chalk.cyan('  Allow reading files? (Y/n): '));
    const canReadFiles = readAnswer.toLowerCase() !== 'n';

    const writeAnswer = await rl.question(chalk.cyan('  Allow writing files? (Y/n): '));
    const canWriteFiles = writeAnswer.toLowerCase() !== 'n';

    const executeAnswer = await rl.question(chalk.cyan('  Allow executing commands? (y/N): '));
    const canExecuteCommands = executeAnswer.toLowerCase() === 'y';

    const permissions: ProjectPermissions = {
      canReadFiles,
      canWriteFiles,
      canExecuteCommands,
      grantedAt: new Date().toISOString(),
    };

    console.log('');
    console.log(chalk.grey('  Initializing project...'));

    // Initialize with basic metadata
    await initializeProject(projectPath, {
      permissions,
      metadata: {},
    });

    console.log(chalk.green('  ✓ Project initialized!'));
    console.log(chalk.grey('  • Created .ollama/ directory'));
    console.log(chalk.grey('  • Generated PROJECT.md'));
    console.log('');
    console.log(chalk.grey('  Tip: Edit PROJECT.md to add project context for better assistance'));
    console.log('');

    return true;
  } finally {
    rl.close();
  }
}

/**
 * Check and enforce permissions
 */
export async function checkPermission(
  projectPath: string,
  permission: 'read' | 'write' | 'execute'
): Promise<boolean> {
  const context = await detectProjectContext(projectPath);

  if (!context.hasOllamaDir) {
    return false; // Not initialized, no permissions
  }

  switch (permission) {
    case 'read':
      return context.permissions.canReadFiles;
    case 'write':
      return context.permissions.canWriteFiles;
    case 'execute':
      return context.permissions.canExecuteCommands;
    default:
      return false;
  }
}
