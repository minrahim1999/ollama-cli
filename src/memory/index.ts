/**
 * Memory and snapshot management
 * Handles change tracking, snapshots, and rollback
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import type {
  Snapshot,
  FileSnapshot,
  SnapshotHistory,
  SnapshotMetadata,
  RevertOptions,
} from '../types/memory.js';
import { getSessionsDir } from '../config/index.js';

/**
 * Get snapshots directory
 */
export function getSnapshotsDir(): string {
  return path.join(path.dirname(getSessionsDir()), 'snapshots');
}

/**
 * Ensure snapshots directory exists
 */
async function ensureSnapshotsDir(): Promise<void> {
  const dir = getSnapshotsDir();
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Compute file hash
 */
function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Create a file snapshot
 */
async function createFileSnapshot(filePath: string): Promise<FileSnapshot | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);

    return {
      path: filePath,
      content,
      hash: computeHash(content),
      size: stats.size,
      mtime: stats.mtime.toISOString(),
    };
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Create a snapshot
 */
export async function createSnapshot(options: {
  reason: string;
  sessionId?: string | undefined;
  files?: string[] | undefined;
  workingDirectory: string;
  toolUsed?: string | undefined;
  userMessage?: string | undefined;
}): Promise<Snapshot> {
  await ensureSnapshotsDir();

  const snapshot: Snapshot = {
    id: randomUUID(),
    sessionId: options.sessionId,
    timestamp: new Date().toISOString(),
    reason: options.reason,
    files: [],
    metadata: {
      toolUsed: options.toolUsed,
      userMessage: options.userMessage,
      workingDirectory: options.workingDirectory,
    },
  };

  // Snapshot specified files
  if (options.files && options.files.length > 0) {
    for (const filePath of options.files) {
      const fileSnapshot = await createFileSnapshot(
        path.resolve(options.workingDirectory, filePath)
      );
      if (fileSnapshot) {
        snapshot.files.push(fileSnapshot);
      }
    }
  }

  // Save snapshot
  await saveSnapshot(snapshot);

  return snapshot;
}

/**
 * Save snapshot to disk
 */
async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const snapshotPath = path.join(getSnapshotsDir(), `${snapshot.id}.json`);
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * Load snapshot from disk
 */
export async function loadSnapshot(snapshotId: string): Promise<Snapshot | null> {
  try {
    const snapshotPath = path.join(getSnapshotsDir(), `${snapshotId}.json`);
    const content = await fs.readFile(snapshotPath, 'utf-8');
    return JSON.parse(content) as Snapshot;
  } catch (error) {
    return null;
  }
}

/**
 * List all snapshots
 */
export async function listSnapshots(sessionId?: string): Promise<SnapshotMetadata[]> {
  await ensureSnapshotsDir();
  const dir = getSnapshotsDir();

  try {
    const files = await fs.readdir(dir);
    const snapshots: SnapshotMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const snapshotPath = path.join(dir, file);
          const content = await fs.readFile(snapshotPath, 'utf-8');
          const snapshot = JSON.parse(content) as Snapshot;

          // Filter by session if specified
          if (!sessionId || snapshot.sessionId === sessionId) {
            snapshots.push({
              id: snapshot.id,
              timestamp: snapshot.timestamp,
              reason: snapshot.reason,
              fileCount: snapshot.files.length,
              sessionId: snapshot.sessionId,
            });
          }
        } catch {
          // Skip invalid snapshots
        }
      }
    }

    // Sort by timestamp (most recent first)
    snapshots.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return snapshots;
  } catch {
    return [];
  }
}

/**
 * Get snapshot history for a session
 */
export async function getSnapshotHistory(sessionId: string): Promise<SnapshotHistory> {
  await ensureSnapshotsDir();
  const allSnapshots = await listSnapshots(sessionId);

  const snapshots: Snapshot[] = [];
  for (const meta of allSnapshots) {
    const snapshot = await loadSnapshot(meta.id);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return {
    sessionId,
    snapshots,
    totalSnapshots: snapshots.length,
    createdAt: snapshots[snapshots.length - 1]?.timestamp || new Date().toISOString(),
    lastUpdated: snapshots[0]?.timestamp || new Date().toISOString(),
  };
}

/**
 * Revert files to a snapshot
 */
export async function revertToSnapshot(options: RevertOptions): Promise<{
  success: boolean;
  filesReverted: string[];
  errors: Array<{ file: string; error: string }>;
}> {
  const snapshot = await loadSnapshot(options.snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${options.snapshotId}`);
  }

  // Create backup snapshot if requested
  if (options.createBackup) {
    const backupFiles = snapshot.files.map((f) => f.path);
    await createSnapshot({
      reason: `Backup before reverting to ${options.snapshotId}`,
      sessionId: snapshot.sessionId,
      files: backupFiles,
      workingDirectory: snapshot.metadata.workingDirectory,
    });
  }

  const filesReverted: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  // Determine which files to revert
  const filesToRevert = options.files
    ? snapshot.files.filter((f) => options.files?.includes(f.path))
    : snapshot.files;

  for (const fileSnapshot of filesToRevert) {
    try {
      // Ensure directory exists
      const dir = path.dirname(fileSnapshot.path);
      await fs.mkdir(dir, { recursive: true });

      // Restore file content
      await fs.writeFile(fileSnapshot.path, fileSnapshot.content, 'utf-8');
      filesReverted.push(fileSnapshot.path);
    } catch (error) {
      errors.push({
        file: fileSnapshot.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: errors.length === 0,
    filesReverted,
    errors,
  };
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<boolean> {
  try {
    const snapshotPath = path.join(getSnapshotsDir(), `${snapshotId}.json`);
    await fs.unlink(snapshotPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean old snapshots (keep last N per session)
 */
export async function cleanOldSnapshots(keepPerSession: number = 10): Promise<number> {
  const allSnapshots = await listSnapshots();

  // Group by session
  const sessionGroups: Record<string, SnapshotMetadata[]> = {};
  for (const snapshot of allSnapshots) {
    const sessionId = snapshot.sessionId || 'no-session';
    if (!sessionGroups[sessionId]) {
      sessionGroups[sessionId] = [];
    }
    sessionGroups[sessionId]!.push(snapshot);
  }

  let deletedCount = 0;

  // Delete old snapshots in each group
  for (const snapshots of Object.values(sessionGroups)) {
    // Already sorted by timestamp (newest first)
    const toDelete = snapshots.slice(keepPerSession);

    for (const snapshot of toDelete) {
      const deleted = await deleteSnapshot(snapshot.id);
      if (deleted) {
        deletedCount++;
      }
    }
  }

  return deletedCount;
}
