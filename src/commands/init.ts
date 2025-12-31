/**
 * Init command
 * Initialize project with .ollama directory and PROJECT.md
 */

import chalk from 'chalk';
import readline from 'readline/promises';
import {
  initializeProject,
  isProjectInitialized,
  getProjectMdPath,
} from '../project/index.js';
import type { ProjectPermissions, ProjectMetadata } from '../types/project.js';
import { displayError, displaySuccess } from '../ui/display.js';

export async function initCommand(projectPath?: string): Promise<void> {
  const workingDir = projectPath || process.cwd();

  try {
    // Check if already initialized
    if (await isProjectInitialized(workingDir)) {
      console.log(chalk.yellow('\n⚠  Project already initialized!'));
      console.log(chalk.grey(`   .ollama directory exists in ${workingDir}`));
      console.log(chalk.grey('   Use --force to reinitialize\n'));
      process.exit(0);
    }

    // Display welcome
    console.clear();
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('          Initialize Ollama CLI Project                     ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════════╝'));
    console.log('');

    console.log(chalk.white('  This will create:'));
    console.log(chalk.grey('  • .ollama/          - Project configuration directory'));
    console.log(chalk.grey('  • PROJECT.md        - Project context for AI'));
    console.log(chalk.grey('  • .ollama/config.json - Project settings'));
    console.log('');

    // Get permissions
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log(chalk.bold.white('  Permissions'));
      console.log(chalk.grey('  ──────────────────────────────────────────────────────────────'));
      console.log('');

      const readAnswer = await rl.question(
        chalk.cyan('  Allow reading files in this project? (Y/n): ')
      );
      const canReadFiles = readAnswer.toLowerCase() !== 'n';

      const writeAnswer = await rl.question(
        chalk.cyan('  Allow writing/editing files? (Y/n): ')
      );
      const canWriteFiles = writeAnswer.toLowerCase() !== 'n';

      const executeAnswer = await rl.question(
        chalk.cyan('  Allow executing commands? (y/N): ')
      );
      const canExecuteCommands = executeAnswer.toLowerCase() === 'y';

      console.log('');
      console.log(chalk.bold.white('  Project Information (optional)'));
      console.log(chalk.grey('  ──────────────────────────────────────────────────────────────'));
      console.log('');

      const framework = await rl.question(chalk.grey('  Framework (e.g., React, Vue, Express): '));
      const language = await rl.question(chalk.grey('  Primary language (e.g., TypeScript, Python): '));
      const packageManager = await rl.question(
        chalk.grey('  Package manager (npm, yarn, pnpm): ')
      );
      const tagsInput = await rl.question(chalk.grey('  Tags (comma-separated): '));

      const tags = tagsInput
        ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined;

      const customInstructions = await rl.question(
        chalk.grey('  Custom instructions for AI (optional): ')
      );

      console.log('');

      const permissions: ProjectPermissions = {
        canReadFiles,
        canWriteFiles,
        canExecuteCommands,
        grantedAt: new Date().toISOString(),
      };

      const metadata: ProjectMetadata = {
        framework: framework || undefined,
        language: language || undefined,
        packageManager: packageManager || undefined,
        tags,
        customInstructions: customInstructions || undefined,
      };

      // Initialize project
      console.log(chalk.grey('  Initializing project...'));
      await initializeProject(workingDir, { permissions, metadata });

      console.log('');
      displaySuccess('Project initialized successfully!');
      console.log('');
      console.log(chalk.white('  Created:'));
      console.log(chalk.green('  ✓ ') + chalk.grey(`.ollama/          - Project configuration`));
      console.log(chalk.green('  ✓ ') + chalk.grey(`PROJECT.md        - Edit this to add project context`));
      console.log('');
      console.log(chalk.white('  Next steps:'));
      console.log(chalk.cyan('  1. ') + chalk.grey(`Edit PROJECT.md to describe your project`));
      console.log(chalk.cyan('  2. ') + chalk.grey(`Run 'ollama-cli' to start coding!`));
      console.log('');

      const projectMdPath = getProjectMdPath(workingDir);
      console.log(chalk.grey(`  PROJECT.md location: ${projectMdPath}`));
      console.log('');
    } finally {
      rl.close();
    }
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('Failed to initialize project');
    }
    process.exit(1);
  }
}
