/**
 * Project and package manager tools
 */

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { ToolCallResult } from '../types/tools.js';

const execAsync = promisify(exec);

/**
 * NPM Info - Get package.json information
 */
export async function npmInfo(params: { cwd?: string }): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    const packagePath = path.join(cwd, 'package.json');

    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content) as Record<string, unknown>;

    const info = {
      name: String(pkg.name || ''),
      version: String(pkg.version || ''),
      description: String(pkg.description || ''),
      main: String(pkg.main || ''),
      scripts: (pkg.scripts as Record<string, unknown>) || {},
      dependencies: (pkg.dependencies as Record<string, unknown>) || {},
      devDependencies: (pkg.devDependencies as Record<string, unknown>) || {},
      engines: (pkg.engines as Record<string, unknown>) || {},
    };

    return {
      success: true,
      data: info,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read package.json',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * NPM Install - Install dependencies (dangerous - requires confirmation)
 */
export async function npmInstall(params: {
  packages?: string[];
  dev?: boolean;
  cwd?: string;
}): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    let command = 'npm install';

    if (params.packages && params.packages.length > 0) {
      command += ' ' + params.packages.join(' ');
      if (params.dev) {
        command += ' --save-dev';
      }
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 120000, // 2 minutes
    });

    return {
      success: true,
      data: {
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install packages',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run Script - Run npm/yarn scripts
 */
export async function runScript(params: {
  script: string;
  cwd?: string;
}): Promise<ToolCallResult> {
  try {
    const cwd = params.cwd || process.cwd();
    const command = `npm run ${params.script}`;

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 120000, // 2 minutes
    });

    return {
      success: true,
      data: {
        script: params.script,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorData =
      error instanceof Error && 'stdout' in error && 'stderr' in error
        ? { stdout: String((error as { stdout: unknown }).stdout || ''), stderr: String((error as { stderr: unknown }).stderr || '') }
        : undefined;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run script',
      data: errorData,
      timestamp: new Date().toISOString(),
    };
  }
}
