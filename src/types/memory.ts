/**
 * Memory and snapshot system type definitions
 */

export interface FileSnapshot {
  path: string;
  content: string;
  hash: string;
  size: number;
  mtime: string;
}

export interface Snapshot {
  id: string;
  sessionId?: string | undefined;
  timestamp: string;
  reason: string; // Why snapshot was created
  files: FileSnapshot[];
  metadata: {
    toolUsed?: string | undefined;
    userMessage?: string | undefined;
    workingDirectory: string;
  };
}

export interface SnapshotDiff {
  snapshotId: string;
  previousSnapshotId?: string | undefined;
  timestamp: string;
  changes: FileChange[];
  summary: {
    filesAdded: number;
    filesModified: number;
    filesDeleted: number;
  };
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  diff?: string; // Unified diff format
}

export interface SnapshotHistory {
  sessionId: string;
  snapshots: Snapshot[];
  totalSnapshots: number;
  createdAt: string;
  lastUpdated: string;
}

export interface RevertOptions {
  snapshotId: string;
  createBackup?: boolean;
  files?: string[]; // Specific files to revert, or all if undefined
}

export interface SnapshotMetadata {
  id: string;
  timestamp: string;
  reason: string;
  fileCount: number;
  sessionId?: string | undefined;
}
