/**
 * Permission Modes System
 * Three execution modes: Normal, Auto-Accept, Plan (read-only)
 */

export type PermissionMode = 'normal' | 'auto-accept' | 'plan';

export interface PermissionState {
  currentMode: PermissionMode;
  verbose: boolean; // Extended thinking/verbose output
}

// Global state for the current session
let currentState: PermissionState = {
  currentMode: 'normal',
  verbose: false,
};

/**
 * Get current permission mode
 */
export function getCurrentMode(): PermissionMode {
  return currentState.currentMode;
}

/**
 * Set permission mode
 */
export function setPermissionMode(mode: PermissionMode): void {
  currentState.currentMode = mode;
}

/**
 * Toggle between permission modes (Normal → Auto-Accept → Plan → Normal)
 */
export function cyclePermissionMode(): PermissionMode {
  const modes: PermissionMode[] = ['normal', 'auto-accept', 'plan'];
  const currentIndex = modes.indexOf(currentState.currentMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  currentState.currentMode = modes[nextIndex]!;
  return currentState.currentMode;
}

/**
 * Get verbose mode state
 */
export function isVerboseMode(): boolean {
  return currentState.verbose;
}

/**
 * Toggle verbose mode (extended thinking)
 */
export function toggleVerboseMode(): boolean {
  currentState.verbose = !currentState.verbose;
  return currentState.verbose;
}

/**
 * Get mode indicator symbol for display
 */
export function getModeIndicator(mode: PermissionMode): string {
  switch (mode) {
    case 'normal':
      return '⏵'; // Normal - single play
    case 'auto-accept':
      return '⏵⏵'; // Auto-accept - double play
    case 'plan':
      return '⏸'; // Plan mode - pause
  }
}

/**
 * Get mode description
 */
export function getModeDescription(mode: PermissionMode): string {
  switch (mode) {
    case 'normal':
      return 'Normal - Require approval for tool execution';
    case 'auto-accept':
      return 'Auto-Accept - Automatically accept edits';
    case 'plan':
      return 'Plan Mode - Read-only analysis (no tool execution)';
  }
}

/**
 * Check if tool execution should be allowed in current mode
 */
export function shouldExecuteTool(toolName: string, mode?: PermissionMode): boolean {
  const m = mode || currentState.currentMode;

  // Plan mode: no tool execution (read-only)
  if (m === 'plan') {
    // Allow only read-only tools in plan mode
    const readOnlyTools = [
      'read_file',
      'glob',
      'tree',
      'git_status',
      'git_diff',
      'git_log',
      'analyze_code',
      'find_symbol',
      'get_imports',
    ];
    return readOnlyTools.includes(toolName);
  }

  // Normal and auto-accept: allow all tools
  return true;
}

/**
 * Check if tool should auto-approve in current mode
 */
export function shouldAutoApproveTool(mode?: PermissionMode): boolean {
  const m = mode || currentState.currentMode;
  return m === 'auto-accept';
}

/**
 * Reset to default state
 */
export function resetPermissionState(): void {
  currentState = {
    currentMode: 'normal',
    verbose: false,
  };
}
