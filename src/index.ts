/**
 * Main export file for programmatic usage
 */

export { OllamaClient } from './api/client.js';
export {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  getEffectiveConfig,
} from './config/index.js';
export {
  createSession,
  loadSession,
  saveSession,
  listSessions,
  deleteSession,
  addMessage,
  clearMessages,
} from './session/index.js';
export { ToolExecutor } from './tools/executor.js';
export {
  getToolDefinition,
  getAllTools,
  getToolsPrompt,
  validateToolParameters,
} from './tools/registry.js';
export {
  createSnapshot,
  loadSnapshot,
  listSnapshots,
  revertToSnapshot,
  deleteSnapshot,
  cleanOldSnapshots,
  getSnapshotHistory,
} from './memory/index.js';
export { compareSnapshots, formatDiffSummary, formatFullDiff } from './memory/diff.js';

// Export types
export * from './types/index.js';
export * from './types/tools.js';
export * from './types/memory.js';
