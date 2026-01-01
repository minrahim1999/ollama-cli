/**
 * Rewind Capability - Roll back code and conversation
 * Combines snapshot reversion with conversation branching
 */

import type { ChatSession } from '../types/index.js';
import { listSnapshots, revertToSnapshot } from '../memory/index.js';
import { createBranch, type BranchMetadata } from '../branches/index.js';
import { select } from '../utils/prompt.js';
import { colors } from '../ui/colors.js';
import { displaySuccess, displayError, displayInfo } from '../ui/display.js';

export interface RewindPoint {
  id: string;
  timestamp: string;
  description: string;
  type: 'snapshot' | 'message' | 'combined';
  snapshotId?: string;
  messageIndex?: number;
}

/**
 * Get available rewind points from snapshots and conversation history
 */
export async function getRewindPoints(session: ChatSession): Promise<RewindPoint[]> {
  const points: RewindPoint[] = [];

  // Get snapshots
  try {
    const snapshots = await listSnapshots(session.id);
    for (const snapshot of snapshots) {
      points.push({
        id: `snapshot-${snapshot.id}`,
        timestamp: snapshot.timestamp,
        description: `📸 ${snapshot.reason} (${snapshot.fileCount} files)`,
        type: 'snapshot',
        snapshotId: snapshot.id,
      });
    }
  } catch {
    // No snapshots available
  }

  // Get conversation milestones (every 5 messages or after tool use)
  for (let i = 0; i < session.messages.length; i++) {
    const message = session.messages[i];
    if (!message) continue;

    // Create rewind point for assistant messages with tool calls
    if (message.role === 'assistant' && i % 5 === 0) {
      const preview = message.content.substring(0, 50);
      points.push({
        id: `message-${i}`,
        timestamp: session.createdAt, // Approximate
        description: `💬 Message ${i + 1}: ${preview}...`,
        type: 'message',
        messageIndex: i,
      });
    }
  }

  // Sort by timestamp (most recent first)
  points.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return points;
}

/**
 * Execute rewind to a specific point
 */
export async function executeRewind(
  session: ChatSession,
  point: RewindPoint,
  branchMetadata?: BranchMetadata
): Promise<{ session: ChatSession; branchCreated: boolean }> {
  let branchCreated = false;

  // Revert snapshot if applicable
  if (point.snapshotId) {
    displayInfo(`Reverting to snapshot: ${point.snapshotId}`);
    try {
      await revertToSnapshot({
        snapshotId: point.snapshotId,
        createBackup: true,
      });
      displaySuccess('Code reverted successfully');
    } catch (error) {
      displayError(`Failed to revert snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Rewind conversation if message index specified
  if (point.messageIndex !== undefined) {
    // Truncate messages to the specified index
    const truncatedMessages = session.messages.slice(0, point.messageIndex + 1);

    // Create a branch if metadata provided
    if (branchMetadata) {
      const branchName = `rewind-${new Date().getTime()}`;
      createBranch(branchMetadata, branchName, truncatedMessages);
      branchCreated = true;
      displaySuccess(`Created branch: ${branchName}`);
    }

    session.messages = truncatedMessages;
    displaySuccess(`Conversation rewound to message ${point.messageIndex + 1}`);
  }

  return { session, branchCreated };
}

/**
 * Interactive rewind interface
 */
export async function interactiveRewind(
  session: ChatSession,
  branchMetadata?: BranchMetadata
): Promise<ChatSession | null> {
  const points = await getRewindPoints(session);

  if (points.length === 0) {
    displayError('No rewind points available');
    console.log('');
    console.log(colors.secondary('Create rewind points by:'));
    console.log(colors.tertiary('  - Making file changes (creates snapshots)'));
    console.log(colors.tertiary('  - Having conversations (creates message checkpoints)'));
    console.log('');
    return null;
  }

  console.log('');
  console.log(colors.primary('⏪ Rewind - Choose a point to return to:'));
  console.log('');

  // Format choices for selection
  const choices = points.map((point) => {
    const date = new Date(point.timestamp).toLocaleString();
    return `${date} - ${point.description}`;
  });

  choices.push('Cancel');

  const selected = await select('Select rewind point:', choices);

  if (selected === 'Cancel') {
    return null;
  }

  const selectedIndex = choices.indexOf(selected);
  const point = points[selectedIndex];

  if (!point) {
    return null;
  }

  // Confirm rewind
  console.log('');
  console.log(colors.warning('⚠️  This will:'));
  if (point.snapshotId) {
    console.log(colors.tertiary('  - Revert file changes to this snapshot'));
  }
  if (point.messageIndex !== undefined) {
    console.log(colors.tertiary(`  - Remove ${session.messages.length - point.messageIndex - 1} messages from conversation`));
  }
  console.log('');

  const confirm = await select('Proceed with rewind?', ['Yes', 'No']);

  if (confirm === 'No') {
    return null;
  }

  // Execute rewind
  const result = await executeRewind(session, point, branchMetadata);

  return result.session;
}
