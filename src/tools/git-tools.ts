/**
 * Git integration tools
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { ToolCallResult } from '../types/tools.js';

const execAsync = promisify(exec);

/**
 * Git Status - Show current git status
 */
export async function gitStatus(params: { cwd?: string }): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    const { stdout } = await execAsync('git status --porcelain -b', { cwd });

    // Parse output
    const lines = stdout.trim().split('\n');
    const branch = lines[0]?.replace('## ', '') || 'unknown';
    const changes = lines.slice(1).map((line) => {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      return { status, file };
    });

    return {
      success: true,
      data: {
        branch,
        changes,
        totalChanges: changes.length,
        clean: changes.length === 0,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get git status',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Git Diff - Show git diff
 */
export async function gitDiff(params: {
  file?: string;
  staged?: boolean;
  cwd?: string;
}): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    const stagedFlag = params.staged ? '--staged' : '';
    const fileArg = params.file || '';
    const command = `git diff ${stagedFlag} ${fileArg}`.trim();

    const { stdout } = await execAsync(command, { cwd });

    return {
      success: true,
      data: {
        diff: stdout,
        file: params.file,
        staged: params.staged || false,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get git diff',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Git Log - Show commit history
 */
export async function gitLog(params: {
  limit?: number;
  cwd?: string;
}): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    const limit = params.limit || 10;
    const command = `git log --oneline -n ${limit}`;

    const { stdout } = await execAsync(command, { cwd });
    const commits = stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' '),
        };
      });

    return {
      success: true,
      data: {
        commits,
        total: commits.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get git log',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Git Branch - List or create branches
 */
export async function gitBranch(params: {
  action?: 'list' | 'create';
  name?: string;
  cwd?: string;
}): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    const action = params.action || 'list';

    if (action === 'list') {
      const { stdout } = await execAsync('git branch -a', { cwd });
      const branches = stdout
        .trim()
        .split('\n')
        .map((line) => ({
          name: line.replace('*', '').trim(),
          current: line.startsWith('*'),
        }));

      return {
        success: true,
        data: {
          branches,
          total: branches.length,
        },
        timestamp: new Date().toISOString(),
      };
    } else if (action === 'create') {
      if (!params.name) {
        return {
          success: false,
          error: 'Branch name required for create action',
          timestamp: new Date().toISOString(),
        };
      }

      await execAsync(`git branch ${params.name}`, { cwd });

      return {
        success: true,
        data: {
          action: 'create',
          branch: params.name,
        },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      error: 'Invalid action',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed git branch operation',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Git Commit - Create a commit (dangerous - requires confirmation)
 */
export async function gitCommit(params: {
  message: string;
  addAll?: boolean;
  cwd?: string;
}): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();

    if (params.addAll) {
      await execAsync('git add -A', { cwd });
    }

    const { stdout } = await execAsync(`git commit -m "${params.message}"`, { cwd });

    return {
      success: true,
      data: {
        message: params.message,
        output: stdout.trim(),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create commit',
      timestamp: new Date().toISOString(),
    };
  }
}
