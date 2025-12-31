/**
 * Enhanced file system tools
 */

import fs from 'fs/promises';
import path from 'path';
import type { ToolCallResult } from '../types/tools.js';

/**
 * Glob - Find files by pattern
 */
export async function glob(params: {
  pattern: string;
  path?: string;
}): Promise<ToolCallResult> {
  try {
    const searchPath = params.path || process.cwd();
    const matches: string[] = [];

    // Convert glob pattern to regex
    const regexPattern = params.pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);

    const walk = async (dir: string, basePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = path.join(basePath, entry.name);
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, etc.
        if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath, relativePath);
        } else if (regex.test(relativePath)) {
          matches.push(relativePath);
        }
      }
    };

    await walk(searchPath);
    matches.sort();

    return {
      success: true,
      data: {
        pattern: params.pattern,
        matches,
        total: matches.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to glob files',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Tree - Show directory structure
 */
export async function tree(params: {
  path?: string;
  maxDepth?: number;
  showHidden?: boolean;
}): Promise<ToolCallResult> {
  try {
    const rootPath = params.path || process.cwd();
    const maxDepth = params.maxDepth || 3;
    const showHidden = params.showHidden || false;

    const treeLines: string[] = [];

    const buildTree = async (
      dir: string,
      prefix: string = '',
      depth: number = 0
    ): Promise<void> => {
      if (depth > maxDepth) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });
      const filteredEntries = entries.filter((entry) => {
        if (!showHidden && entry.name.startsWith('.')) return false;
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) return false;
        return true;
      });

      filteredEntries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (let i = 0; i < filteredEntries.length; i++) {
        const entry = filteredEntries[i]!;
        const isLast = i === filteredEntries.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        const icon = entry.isDirectory() ? '📁 ' : '📄 ';

        treeLines.push(prefix + branch + icon + entry.name);

        if (entry.isDirectory()) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          await buildTree(path.join(dir, entry.name), newPrefix, depth + 1);
        }
      }
    };

    treeLines.push('📁 ' + path.basename(rootPath));
    await buildTree(rootPath, '', 0);

    return {
      success: true,
      data: {
        tree: treeLines.join('\n'),
        path: rootPath,
        maxDepth,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build tree',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * File Info - Get file metadata
 */
export async function fileInfo(params: { path: string }): Promise<ToolCallResult> {
  try {
    const stats = await fs.stat(params.path);
    const content = stats.isFile() ? await fs.readFile(params.path, 'utf-8') : null;

    const info = {
      path: params.path,
      type: stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other',
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      permissions: stats.mode.toString(8).slice(-3),
      lines: content ? content.split('\n').length : undefined,
      extension: stats.isFile() ? path.extname(params.path) : undefined,
    };

    return {
      success: true,
      data: info,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file info',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
