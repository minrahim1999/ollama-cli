/**
 * Hooks System - Event-driven automation
 * Execute shell commands in response to events
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

const execPromise = promisify(exec);

export type HookEvent =
  | 'tool:before'
  | 'tool:after'
  | 'tool:error'
  | 'message:user'
  | 'message:assistant'
  | 'session:start'
  | 'session:end'
  | 'error';

export interface HookConfig {
  event: HookEvent;
  command: string;
  enabled: boolean;
  description?: string | undefined;
}

export interface HookContext {
  event: HookEvent;
  toolName?: string | undefined;
  toolParams?: Record<string, unknown> | undefined;
  toolResult?: unknown | undefined;
  message?: string | undefined;
  error?: string | undefined;
  sessionId?: string | undefined;
}

export interface HookResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

// Global hooks configuration
let hooksConfig: HookConfig[] = [];

/**
 * Get hooks configuration directory
 */
function getHooksDir(): string {
  return path.join(homedir(), '.ollama-cli', 'hooks');
}

/**
 * Get hooks configuration file path
 */
function getHooksConfigPath(): string {
  return path.join(getHooksDir(), 'hooks.json');
}

/**
 * Load hooks configuration
 */
export async function loadHooks(): Promise<HookConfig[]> {
  try {
    const configPath = getHooksConfigPath();
    const content = await fs.readFile(configPath, 'utf-8');
    hooksConfig = JSON.parse(content) as HookConfig[];
    return hooksConfig;
  } catch {
    // No hooks configured
    hooksConfig = [];
    return [];
  }
}

/**
 * Save hooks configuration
 */
export async function saveHooks(hooks: HookConfig[]): Promise<void> {
  const hooksDir = getHooksDir();
  await fs.mkdir(hooksDir, { recursive: true });

  const configPath = getHooksConfigPath();
  await fs.writeFile(configPath, JSON.stringify(hooks, null, 2), 'utf-8');
  hooksConfig = hooks;
}

/**
 * Add a new hook
 */
export async function addHook(hook: HookConfig): Promise<void> {
  const hooks = await loadHooks();
  hooks.push(hook);
  await saveHooks(hooks);
}

/**
 * Remove a hook
 */
export async function removeHook(index: number): Promise<void> {
  const hooks = await loadHooks();
  hooks.splice(index, 1);
  await saveHooks(hooks);
}

/**
 * Enable/disable a hook
 */
export async function toggleHook(index: number, enabled: boolean): Promise<void> {
  const hooks = await loadHooks();
  if (hooks[index]) {
    hooks[index]!.enabled = enabled;
    await saveHooks(hooks);
  }
}

/**
 * Get hooks for a specific event
 */
export function getHooksForEvent(event: HookEvent): HookConfig[] {
  return hooksConfig.filter((hook) => hook.event === event && hook.enabled);
}

/**
 * Execute a hook command
 */
async function executeHookCommand(command: string, context: HookContext): Promise<HookResult> {
  try {
    // Replace placeholders in command
    let cmd = command;
    cmd = cmd.replace(/\$\{event\}/g, context.event);
    cmd = cmd.replace(/\$\{toolName\}/g, context.toolName || '');
    cmd = cmd.replace(/\$\{message\}/g, context.message || '');
    cmd = cmd.replace(/\$\{sessionId\}/g, context.sessionId || '');

    const { stdout, stderr } = await execPromise(cmd, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      return {
        success: false,
        stdout: 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '',
        stderr: 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '',
        exitCode: typeof error.code === 'number' ? error.code : 1,
      };
    }

    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
      exitCode: 1,
    };
  }
}

/**
 * Trigger hooks for an event
 */
export async function triggerHooks(context: HookContext): Promise<HookResult[]> {
  const hooks = getHooksForEvent(context.event);
  const results: HookResult[] = [];

  for (const hook of hooks) {
    const result = await executeHookCommand(hook.command, context);
    results.push(result);

    // Stop on error if hook fails
    if (!result.success) {
      break;
    }
  }

  return results;
}

/**
 * Get default hooks examples
 */
export function getDefaultHooks(): HookConfig[] {
  return [
    {
      event: 'tool:before',
      command: 'echo "Executing tool: ${toolName}"',
      enabled: false,
      description: 'Log tool execution',
    },
    {
      event: 'tool:after',
      command: 'notify-send "Tool completed" "${toolName} finished"',
      enabled: false,
      description: 'Desktop notification on tool completion',
    },
    {
      event: 'session:start',
      command: 'echo "Session started at $(date)" >> ~/.ollama-cli/session.log',
      enabled: false,
      description: 'Log session start',
    },
    {
      event: 'error',
      command: 'echo "Error occurred: ${error}" | mail -s "Ollama CLI Error" user@example.com',
      enabled: false,
      description: 'Email on errors',
    },
  ];
}

/**
 * Initialize hooks system
 */
export async function initializeHooks(): Promise<void> {
  await loadHooks();
}

/**
 * List all hooks
 */
export async function listHooks(): Promise<HookConfig[]> {
  return await loadHooks();
}
