/**
 * Command execution utilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Execute a shell command asynchronously
 */
export async function execAsync(command: string, options?: { timeout?: number }): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execPromise(command, {
      timeout: options?.timeout || 30000, // 30s default
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return {
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      code: 0,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      return {
        stdout: 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '',
        stderr: 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '',
        code: typeof error.code === 'number' ? error.code : 1,
      };
    }

    throw error;
  }
}
