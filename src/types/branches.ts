/**
 * Conversation branching types
 */

export interface ConversationBranch {
  id: string;
  name: string;
  parentBranchId?: string | undefined;
  forkPointIndex: number; // Message index where branch was created
  messages: import('./index.js').Message[];
  createdAt: string;
  isActive: boolean;
}

export interface BranchMetadata {
  currentBranchId: string;
  branches: ConversationBranch[];
}
