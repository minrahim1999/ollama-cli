/**
 * Git operations wrapper
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { GitStatus, Commit } from '../types/git.js';

const execAsync = promisify(exec);

/**
 * Check if current directory is a git repository
 */
export async function isGitRepository(cwd: string = process.cwd()): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  const { stdout } = await execAsync('git branch --show-current', { cwd });
  return stdout.trim();
}

/**
 * Get git status
 */
export async function getGitStatus(cwd: string = process.cwd()): Promise<GitStatus> {
  const { stdout } = await execAsync('git status --porcelain --branch', { cwd });
  const lines = stdout.trim().split('\n');

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  let branch = 'main';
  let ahead = 0;
  let behind = 0;

  for (const line of lines) {
    if (line.startsWith('##')) {
      // Branch line: ## master...origin/master [ahead 1, behind 2]
      const branchMatch = /##\s+([^\s.]+)/.exec(line);
      if (branchMatch && branchMatch[1]) {
        branch = branchMatch[1];
      }

      const aheadMatch = /ahead\s+(\d+)/.exec(line);
      if (aheadMatch && aheadMatch[1]) {
        ahead = parseInt(aheadMatch[1], 10);
      }

      const behindMatch = /behind\s+(\d+)/.exec(line);
      if (behindMatch && behindMatch[1]) {
        behind = parseInt(behindMatch[1], 10);
      }
    } else {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      if (status[0] === '?' && status[1] === '?') {
        untracked.push(file);
      } else if (status[0] !== ' ' && status[0] !== '?') {
        staged.push(file);
      } else if (status[1] !== ' ') {
        unstaged.push(file);
      }
    }
  }

  return {
    branch,
    staged,
    unstaged,
    untracked,
    ahead,
    behind,
  };
}

/**
 * Get staged diff
 */
export async function getStagedDiff(cwd: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execAsync('git diff --cached', { cwd });
    return stdout;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 1) {
      // No diff
      return '';
    }
    throw error;
  }
}

/**
 * Get diff between branches
 */
export async function getBranchDiff(
  base: string,
  cwd: string = process.cwd()
): Promise<string> {
  const { stdout } = await execAsync(`git diff ${base}...HEAD`, { cwd });
  return stdout;
}

/**
 * Get recent commits
 */
export async function getRecentCommits(
  count: number,
  cwd: string = process.cwd()
): Promise<Commit[]> {
  const { stdout } = await execAsync(
    `git log -${count} --format=%H%n%s%n%an%n%ad%n---`,
    { cwd }
  );

  const commits: Commit[] = [];
  const entries = stdout.trim().split('---\n');

  for (const entry of entries) {
    const lines = entry.trim().split('\n');
    if (lines.length >= 4 && lines[0] && lines[1] && lines[2] && lines[3]) {
      commits.push({
        hash: lines[0],
        message: lines[1],
        author: lines[2],
        date: lines[3],
      });
    }
  }

  return commits;
}

/**
 * Stage files
 */
export async function stageFiles(
  files: string[],
  cwd: string = process.cwd()
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  const filesArg = files.map((f) => `"${f}"`).join(' ');
  await execAsync(`git add ${filesArg}`, { cwd });
}

/**
 * Create a commit
 */
export async function createCommit(
  message: string,
  cwd: string = process.cwd()
): Promise<void> {
  // Escape message for shell
  const escapedMessage = message.replace(/"/g, '\\"');
  await execAsync(`git commit -m "${escapedMessage}"`, { cwd });
}
