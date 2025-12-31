/**
 * Git workflow commands
 */

import chalk from 'chalk';
import readline from 'readline';
import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import {
  isGitRepository,
  getStagedDiff,
  getBranchDiff,
  createCommit,
  getCurrentBranch,
} from '../git/index.js';
import type { CommitStyle } from '../types/git.js';
import { GIT_TEMPLATES } from '../templates/git-templates.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';

export type GitCommand = 'commit-msg' | 'pr-summary' | 'review';

interface GitOptions {
  model?: string | undefined;
  style?: CommitStyle | undefined;
  autoCommit?: boolean | undefined;
  base?: string | undefined;
}

/**
 * Main git command handler
 */
export async function gitCommand(
  command: GitCommand,
  options: GitOptions
): Promise<void> {
  // Check if in a git repository
  const isGit = await isGitRepository();
  if (!isGit) {
    displayError('Not a git repository');
    return;
  }

  switch (command) {
    case 'commit-msg':
      await generateCommitMessage(options);
      break;

    case 'pr-summary':
      await generatePRSummary(options);
      break;

    case 'review':
      await reviewStagedChanges(options);
      break;

    default:
      displayError(`Unknown git command: ${command}`);
  }
}

/**
 * Generate commit message from staged changes
 */
async function generateCommitMessage(options: GitOptions): Promise<void> {
  try {
    // Get staged diff
    const diff = await getStagedDiff();

    if (!diff || diff.trim() === '') {
      displayError('No staged changes found');
      console.log('');
      console.log(colors.secondary('Stage files first:'));
      console.log(`  ${colors.tertiary('git add <files>')}`);
      console.log('');
      return;
    }

    const style = options.style || 'conventional';
    const styleGuide =
      style === 'conventional'
        ? GIT_TEMPLATES.COMMIT_MESSAGE_CONVENTIONAL
        : GIT_TEMPLATES.COMMIT_MESSAGE_SIMPLE;

    // Build prompt
    const prompt = GIT_TEMPLATES.COMMIT_MESSAGE.replace('{{diff}}', diff)
      .replace(/\{\{style\}\}/g, style)
      .replace('{{styleGuide}}', styleGuide);

    console.log('');
    console.log(gradients.brand('Generating Commit Message'));
    console.log('');
    console.log(colors.secondary('Analyzing staged changes...'));
    console.log('');

    // Call LLM
    const config = await getEffectiveConfig();
    const model = options.model || config.defaultModel;
    const client = new OllamaClient(config.baseUrl, config.timeoutMs);

    let fullResponse = '';

    for await (const chunk of client.chat({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates clear, concise git commit messages.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    console.log('\n');

    // Ask to commit
    if (options.autoCommit) {
      await createCommit(fullResponse.trim());
      displaySuccess('Committed!');
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(
          chalk.cyan('\nUse this commit message? (yes/no/edit): '),
          (answer) => {
            rl.close();
            resolve(answer.toLowerCase());
          }
        );
      });

      if (answer === 'yes' || answer === 'y') {
        await createCommit(fullResponse.trim());
        displaySuccess('Committed!');
      } else if (answer === 'edit' || answer === 'e') {
        displayInfo('Copy the message above and commit manually');
      } else {
        displayInfo('Cancelled');
      }
    }
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to generate commit message'
    );
  }
}

/**
 * Generate PR summary from branch diff
 */
async function generatePRSummary(options: GitOptions): Promise<void> {
  try {
    const base = options.base || 'main';

    // Try base branch, fallback to master
    let diff: string;
    try {
      diff = await getBranchDiff(base);
    } catch {
      try {
        diff = await getBranchDiff('master');
      } catch {
        displayError(`Cannot find base branch: ${base} or master`);
        return;
      }
    }

    if (!diff || diff.trim() === '') {
      displayError('No changes found');
      return;
    }

    const currentBranch = await getCurrentBranch();

    // Build prompt
    const prompt = GIT_TEMPLATES.PR_SUMMARY.replace('{{diff}}', diff).replace(
      '{{base}}',
      base
    );

    console.log('');
    console.log(gradients.brand('Generating PR Summary'));
    console.log('');
    console.log(colors.secondary(`Branch: ${currentBranch} → ${base}`));
    console.log('');

    // Call LLM
    const config = await getEffectiveConfig();
    const model = options.model || config.defaultModel;
    const client = new OllamaClient(config.baseUrl, config.timeoutMs);

    for await (const chunk of client.chat({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates comprehensive pull request descriptions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
    }

    console.log('\n');

    displayInfo('Copy the PR description above to use in your pull request');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to generate PR summary'
    );
  }
}

/**
 * Review staged changes
 */
async function reviewStagedChanges(options: GitOptions): Promise<void> {
  try {
    // Get staged diff
    const diff = await getStagedDiff();

    if (!diff || diff.trim() === '') {
      displayError('No staged changes found');
      console.log('');
      console.log(colors.secondary('Stage files first:'));
      console.log(`  ${colors.tertiary('git add <files>')}`);
      console.log('');
      return;
    }

    // Build prompt
    const prompt = GIT_TEMPLATES.CODE_REVIEW.replace('{{diff}}', diff);

    console.log('');
    console.log(gradients.brand('Code Review'));
    console.log('');
    console.log(colors.secondary('Reviewing staged changes...'));
    console.log('');

    // Call LLM
    const config = await getEffectiveConfig();
    const model = options.model || config.defaultModel;
    const client = new OllamaClient(config.baseUrl, config.timeoutMs);

    for await (const chunk of client.chat({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful code reviewer. Provide constructive feedback on code quality, bugs, security, and best practices.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
    }

    console.log('\n');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to review changes'
    );
  }
}
