/**
 * Conversation branching system
 * Fork conversations to explore different approaches
 */

import { randomUUID } from 'crypto';
import type { ConversationBranch, BranchMetadata } from '../types/branches.js';
import type { Message } from '../types/index.js';

// Export types for external use
export type { BranchMetadata, ConversationBranch };

/**
 * Initialize branch metadata for a session
 */
export function initializeBranches(messages: Message[]): BranchMetadata {
  const mainBranch: ConversationBranch = {
    id: 'main',
    name: 'main',
    parentBranchId: undefined,
    forkPointIndex: 0,
    messages: [...messages],
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  return {
    currentBranchId: 'main',
    branches: [mainBranch],
  };
}

/**
 * Create a new branch from current conversation state
 */
export function createBranch(
  metadata: BranchMetadata,
  name: string,
  messages: Message[]
): BranchMetadata {
  const currentBranch = metadata.branches.find((b) => b.id === metadata.currentBranchId);
  if (!currentBranch) {
    throw new Error('Current branch not found');
  }

  const newBranch: ConversationBranch = {
    id: randomUUID(),
    name,
    parentBranchId: metadata.currentBranchId,
    forkPointIndex: messages.length,
    messages: [...messages],
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  // Deactivate all existing branches
  const updatedBranches = metadata.branches.map((b) => ({
    ...b,
    isActive: false,
  }));

  return {
    currentBranchId: newBranch.id,
    branches: [...updatedBranches, newBranch],
  };
}

/**
 * Switch to a different branch
 */
export function switchBranch(
  metadata: BranchMetadata,
  branchId: string
): { metadata: BranchMetadata; messages: Message[] } {
  const targetBranch = metadata.branches.find((b) => b.id === branchId);
  if (!targetBranch) {
    throw new Error(`Branch not found: ${branchId}`);
  }

  const updatedBranches = metadata.branches.map((b) => ({
    ...b,
    isActive: b.id === branchId,
  }));

  return {
    metadata: {
      currentBranchId: branchId,
      branches: updatedBranches,
    },
    messages: [...targetBranch.messages],
  };
}

/**
 * Get current branch
 */
export function getCurrentBranch(metadata: BranchMetadata): ConversationBranch | null {
  return metadata.branches.find((b) => b.id === metadata.currentBranchId) || null;
}

/**
 * List all branches
 */
export function listBranches(metadata: BranchMetadata): ConversationBranch[] {
  return metadata.branches;
}

/**
 * Delete a branch
 */
export function deleteBranch(
  metadata: BranchMetadata,
  branchId: string
): BranchMetadata {
  if (branchId === 'main') {
    throw new Error('Cannot delete main branch');
  }

  if (metadata.currentBranchId === branchId) {
    throw new Error('Cannot delete active branch. Switch to another branch first.');
  }

  return {
    ...metadata,
    branches: metadata.branches.filter((b) => b.id !== branchId),
  };
}

/**
 * Update current branch messages
 */
export function updateBranchMessages(
  metadata: BranchMetadata,
  messages: Message[]
): BranchMetadata {
  const updatedBranches = metadata.branches.map((b) => {
    if (b.id === metadata.currentBranchId) {
      return {
        ...b,
        messages: [...messages],
      };
    }
    return b;
  });

  return {
    ...metadata,
    branches: updatedBranches,
  };
}
