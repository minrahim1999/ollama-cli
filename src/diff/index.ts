/**
 * Diff-based code application
 * Generate and apply unified diffs for safer code changes
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

/**
 * Generate unified diff between two strings
 */
export async function generateDiff(
  oldContent: string,
  newContent: string,
  filePath: string
): Promise<string> {
  // Use git diff if available for better diffs
  try {
    const tmpDir = '/tmp/ollama-cli-diff';
    await fs.mkdir(tmpDir, { recursive: true });

    const oldFile = path.join(tmpDir, 'old');
    const newFile = path.join(tmpDir, 'new');

    await fs.writeFile(oldFile, oldContent);
    await fs.writeFile(newFile, newContent);

    const { stdout } = await execAsync(`diff -u "${oldFile}" "${newFile}" || true`);

    // Clean up
    await fs.unlink(oldFile).catch(() => {});
    await fs.unlink(newFile).catch(() => {});

    // Format as unified diff with file paths
    if (stdout) {
      const lines = stdout.split('\n');
      lines[0] = `--- a/${filePath}`;
      lines[1] = `+++ b/${filePath}`;
      return lines.join('\n');
    }

    return '';
  } catch (error) {
    // Fallback to simple line-by-line diff
    return generateSimpleDiff(oldContent, newContent, filePath);
  }
}

/**
 * Simple line-by-line diff generator (fallback)
 */
function generateSimpleDiff(
  oldContent: string,
  newContent: string,
  filePath: string
): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const diff: string[] = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
  ];

  // Simple diff: show all old lines as removed, new lines as added
  for (const line of oldLines) {
    diff.push(`-${line}`);
  }
  for (const line of newLines) {
    diff.push(`+${line}`);
  }

  return diff.join('\n');
}

/**
 * Apply a unified diff to a file
 */
export async function applyDiff(
  diffContent: string,
  workingDir: string = process.cwd()
): Promise<{ success: boolean; message: string }> {
  try {
    // Write diff to temp file
    const tmpDiff = path.join('/tmp', `ollama-cli-${Date.now()}.patch`);
    await fs.writeFile(tmpDiff, diffContent);

    // Apply using patch command
    const { stdout } = await execAsync(`cd "${workingDir}" && patch -p1 < "${tmpDiff}"`);

    // Clean up
    await fs.unlink(tmpDiff).catch(() => {});

    return {
      success: true,
      message: stdout || 'Patch applied successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to apply patch',
    };
  }
}

/**
 * Preview diff without applying
 */
export async function previewDiff(diffContent: string): Promise<string> {
  return diffContent;
}

/**
 * Parse unified diff format
 */
export function parseDiff(diffContent: string): FileDiff[] {
  const lines = diffContent.split('\n');
  const diffs: FileDiff[] = [];
  let currentDiff: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    if (line.startsWith('--- ')) {
      if (currentDiff && currentHunk) {
        currentDiff.hunks.push(currentHunk);
      }
      if (currentDiff) {
        diffs.push(currentDiff);
      }

      currentDiff = {
        oldPath: line.substring(4).replace(/^a\//, ''),
        newPath: '',
        hunks: [],
      };
      currentHunk = null;
    } else if (line.startsWith('+++ ')) {
      if (currentDiff) {
        currentDiff.newPath = line.substring(4).replace(/^b\//, '');
      }
    } else if (line.startsWith('@@')) {
      if (currentHunk && currentDiff) {
        currentDiff.hunks.push(currentHunk);
      }

      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1]!, 10),
          oldLines: parseInt(match[2]!, 10),
          newStart: parseInt(match[3]!, 10),
          newLines: parseInt(match[4]!, 10),
          lines: [],
        };
      }
    } else if (currentHunk) {
      currentHunk.lines.push(line);
    }
  }

  if (currentDiff && currentHunk) {
    currentDiff.hunks.push(currentHunk);
  }
  if (currentDiff) {
    diffs.push(currentDiff);
  }

  return diffs;
}

/**
 * Extract file path from diff
 */
export function extractFilePath(diffContent: string): string | null | undefined {
  const match = diffContent.match(/^\+\+\+ b\/(.+)$/m);
  return match ? match[1] : null;
}
