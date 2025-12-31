/**
 * Write mode command
 * Specialized mode for file operations with automatic snapshots
 */

import { chatCommandEnhanced } from './chat-enhanced.js';

interface WriteOptions {
  model?: string;
  session?: string;
  workingDir?: string;
}

/**
 * Write mode - specialized for file operations
 * Automatically uses file-writer assistant
 */
export async function writeCommand(options: WriteOptions): Promise<void> {
  // Write mode always uses file-writer assistant and enables tools
  await chatCommandEnhanced({
    ...options,
    assistant: 'file-writer',
    tools: true,
  });
}
