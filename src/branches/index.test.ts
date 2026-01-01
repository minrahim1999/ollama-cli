/**
 * Tests for Conversation Branching
 */

import { describe, it, expect } from 'vitest';
import {
  initializeBranches,
  createBranch,
  switchBranch,
  listBranches,
  deleteBranch,
  getCurrentBranch,
  updateBranchMessages,
} from './index.js';
import type { Message } from '../types/index.js';

describe('Conversation Branching', () => {
  const sampleMessages: Message[] = [
    { role: 'user', content: 'Message 1' },
    { role: 'assistant', content: 'Response 1' },
  ];

  describe('initializeBranches', () => {
    it('should initialize with main branch', () => {
      const metadata = initializeBranches(sampleMessages);

      expect(metadata.currentBranchId).toBe('main');
      expect(metadata.branches).toHaveLength(1);
      expect(metadata.branches[0]?.name).toBe('main');
      expect(metadata.branches[0]?.isActive).toBe(true);
    });

    it('should copy messages to main branch', () => {
      const metadata = initializeBranches(sampleMessages);
      const mainBranch = metadata.branches[0]!;

      expect(mainBranch.messages).toHaveLength(2);
      expect(mainBranch.messages[0]?.content).toBe('Message 1');
    });
  });

  describe('createBranch', () => {
    it('should create new branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'feature-branch', sampleMessages);

      expect(metadata.branches).toHaveLength(2);
      expect(metadata.currentBranchId).not.toBe('main');

      const newBranch = metadata.branches.find((b) => b.name === 'feature-branch');
      expect(newBranch).toBeDefined();
      expect(newBranch?.isActive).toBe(true);
    });

    it('should set parent branch ID', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'child', sampleMessages);

      const childBranch = metadata.branches.find((b) => b.name === 'child');
      expect(childBranch?.parentBranchId).toBe('main');
    });

    it('should deactivate previous branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'new-branch', sampleMessages);

      const mainBranch = metadata.branches.find((b) => b.id === 'main');
      expect(mainBranch?.isActive).toBe(false);
    });
  });

  describe('switchBranch', () => {
    it('should switch to different branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'branch-2', sampleMessages);

      const result = switchBranch(metadata, 'main');

      expect(result.metadata.currentBranchId).toBe('main');
      expect(result.messages).toHaveLength(2);
    });

    it('should activate target branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'branch-2', sampleMessages);

      const result = switchBranch(metadata, 'main');
      const mainBranch = result.metadata.branches.find((b) => b.id === 'main');

      expect(mainBranch?.isActive).toBe(true);
    });

    it('should throw error for non-existent branch', () => {
      const metadata = initializeBranches(sampleMessages);

      expect(() => switchBranch(metadata, 'non-existent')).toThrow();
    });
  });

  describe('listBranches', () => {
    it('should list all branches', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'branch-1', sampleMessages);
      metadata = createBranch(metadata, 'branch-2', sampleMessages);

      const branches = listBranches(metadata);
      expect(branches).toHaveLength(3);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch', () => {
      const metadata = initializeBranches(sampleMessages);
      const current = getCurrentBranch(metadata);

      expect(current).not.toBeNull();
      expect(current?.id).toBe('main');
      expect(current?.isActive).toBe(true);
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'to-delete', sampleMessages);

      const branchId = metadata.branches.find((b) => b.name === 'to-delete')?.id!;
      metadata = switchBranch(metadata, 'main').metadata;
      metadata = deleteBranch(metadata, branchId);

      expect(metadata.branches).toHaveLength(1);
    });

    it('should not delete main branch', () => {
      const metadata = initializeBranches(sampleMessages);

      expect(() => deleteBranch(metadata, 'main')).toThrow('Cannot delete main branch');
    });

    it('should not delete active branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'active', sampleMessages);

      const activeBranchId = metadata.currentBranchId;

      expect(() => deleteBranch(metadata, activeBranchId)).toThrow('Cannot delete active branch');
    });
  });

  describe('updateBranchMessages', () => {
    it('should update current branch messages', () => {
      const metadata = initializeBranches(sampleMessages);
      const newMessages: Message[] = [
        ...sampleMessages,
        { role: 'user', content: 'New message' },
      ];

      const updated = updateBranchMessages(metadata, newMessages);
      const mainBranch = updated.branches.find((b) => b.id === 'main');

      expect(mainBranch?.messages).toHaveLength(3);
    });

    it('should only update current branch', () => {
      let metadata = initializeBranches(sampleMessages);
      metadata = createBranch(metadata, 'other', sampleMessages);

      const newMessages: Message[] = [
        ...sampleMessages,
        { role: 'user', content: 'New' },
      ];

      const updated = updateBranchMessages(metadata, newMessages);
      const mainBranch = updated.branches.find((b) => b.id === 'main');
      const otherBranch = updated.branches.find((b) => b.name === 'other');

      expect(otherBranch?.messages).toHaveLength(3);
      expect(mainBranch?.messages).toHaveLength(2); // Unchanged
    });
  });
});
