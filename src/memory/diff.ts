/**
 * Diff generation for snapshots
 * Compares snapshots and generates unified diffs
 */

import type { Snapshot, SnapshotDiff, FileChange } from '../types/memory.js';
import { loadSnapshot } from './index.js';

/**
 * Generate unified diff format
 */
function generateUnifiedDiff(
  oldContent: string,
  newContent: string,
  filePath: string
): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  let diff = `--- ${filePath}\n+++ ${filePath}\n`;

  // Simple line-by-line diff
  const maxLines = Math.max(oldLines.length, newLines.length);
  let hunkStart = 0;
  let hunkLines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      if (hunkLines.length > 0) {
        hunkLines.push(` ${oldLine || ''}`);
      }
    } else {
      if (hunkLines.length === 0) {
        hunkStart = i;
        // Add context line before
        if (i > 0) {
          hunkLines.push(` ${oldLines[i - 1] || ''}`);
        }
      }

      if (oldLine !== undefined) {
        hunkLines.push(`-${oldLine}`);
      }
      if (newLine !== undefined) {
        hunkLines.push(`+${newLine}`);
      }
    }

    // End hunk if we have enough context
    if (hunkLines.length > 0 && (i === maxLines - 1 || (oldLines[i + 1] === newLines[i + 1] && i - hunkStart > 3))) {
      // Add context line after
      if (i < maxLines - 1 && oldLines[i + 1] === newLines[i + 1]) {
        hunkLines.push(` ${oldLines[i + 1] || ''}`);
      }

      diff += `@@ -${hunkStart + 1},${hunkLines.filter(l => l.startsWith('-') || l.startsWith(' ')).length} +${hunkStart + 1},${hunkLines.filter(l => l.startsWith('+') || l.startsWith(' ')).length} @@\n`;
      diff += hunkLines.join('\n') + '\n';
      hunkLines = [];
    }
  }

  return diff;
}

/**
 * Compare two snapshots and generate diff
 */
export async function compareSnapshots(
  snapshotId: string,
  previousSnapshotId?: string
): Promise<SnapshotDiff> {
  const snapshot = await loadSnapshot(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  let previousSnapshot: Snapshot | null = null;
  if (previousSnapshotId) {
    previousSnapshot = await loadSnapshot(previousSnapshotId);
  }

  const changes: FileChange[] = [];
  const currentFiles = new Map(snapshot.files.map((f) => [f.path, f]));
  const previousFiles = new Map(
    previousSnapshot?.files.map((f) => [f.path, f]) || []
  );

  // Find added and modified files
  for (const [filePath, currentFile] of currentFiles) {
    const previousFile = previousFiles.get(filePath);

    if (!previousFile) {
      // File was added
      changes.push({
        path: filePath,
        type: 'added',
        newContent: currentFile.content,
        diff: `+++ ${filePath}\n${currentFile.content.split('\n').map(l => `+${l}`).join('\n')}`,
      });
    } else if (previousFile.hash !== currentFile.hash) {
      // File was modified
      changes.push({
        path: filePath,
        type: 'modified',
        oldContent: previousFile.content,
        newContent: currentFile.content,
        diff: generateUnifiedDiff(previousFile.content, currentFile.content, filePath),
      });
    }
  }

  // Find deleted files
  for (const [filePath, previousFile] of previousFiles) {
    if (!currentFiles.has(filePath)) {
      changes.push({
        path: filePath,
        type: 'deleted',
        oldContent: previousFile.content,
        diff: `--- ${filePath}\n${previousFile.content.split('\n').map(l => `-${l}`).join('\n')}`,
      });
    }
  }

  const summary = {
    filesAdded: changes.filter((c) => c.type === 'added').length,
    filesModified: changes.filter((c) => c.type === 'modified').length,
    filesDeleted: changes.filter((c) => c.type === 'deleted').length,
  };

  return {
    snapshotId,
    previousSnapshotId,
    timestamp: snapshot.timestamp,
    changes,
    summary,
  };
}

/**
 * Generate summary of changes
 */
export function formatDiffSummary(diff: SnapshotDiff): string {
  let summary = `Snapshot: ${diff.snapshotId}\n`;
  summary += `Timestamp: ${new Date(diff.timestamp).toLocaleString()}\n`;
  summary += `\nChanges:\n`;
  summary += `  Added: ${diff.summary.filesAdded} file(s)\n`;
  summary += `  Modified: ${diff.summary.filesModified} file(s)\n`;
  summary += `  Deleted: ${diff.summary.filesDeleted} file(s)\n`;
  summary += `\n`;

  for (const change of diff.changes) {
    const symbol =
      change.type === 'added' ? '+' : change.type === 'deleted' ? '-' : '~';
    summary += `${symbol} ${change.path}\n`;
  }

  return summary;
}

/**
 * Format full diff for display
 */
export function formatFullDiff(diff: SnapshotDiff): string {
  let output = formatDiffSummary(diff);
  output += '\n';
  output += '='.repeat(80) + '\n\n';

  for (const change of diff.changes) {
    output += `File: ${change.path} (${change.type})\n`;
    output += '-'.repeat(80) + '\n';
    output += change.diff || '';
    output += '\n\n';
  }

  return output;
}
