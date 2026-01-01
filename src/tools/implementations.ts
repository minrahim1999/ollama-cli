/**
 * Tool implementations
 * Core functionality for each tool
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  ReadFileParams,
  WriteFileParams,
  EditFileParams,
  ListDirectoryParams,
  SearchFilesParams,
  BashParams,
  ExecuteCodeParams,
  CopyFileParams,
  MoveFileParams,
  DeleteFileParams,
  CreateDirectoryParams,
  ToolCallResult,
} from '../types/tools.js';

const execAsync = promisify(exec);

/**
 * Read file with optional line range
 */
export async function readFile(params: ReadFileParams): Promise<ToolCallResult> {
  try {
    const content = await fs.readFile(params.file_path, 'utf-8');
    const lines = content.split('\n');

    let result: string;
    if (params.offset !== undefined || params.limit !== undefined) {
      const offset = (params.offset ?? 1) - 1; // Convert to 0-based
      const limit = params.limit ?? lines.length;
      const selectedLines = lines.slice(offset, offset + limit);

      // Format with line numbers
      result = selectedLines
        .map((line, idx) => `${offset + idx + 1}: ${line}`)
        .join('\n');
    } else {
      // Full file with line numbers
      result = lines.map((line, idx) => `${idx + 1}: ${line}`).join('\n');
    }

    return {
      success: true,
      data: {
        file_path: params.file_path,
        content: result,
        total_lines: lines.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Write file (create or overwrite)
 */
export async function writeFile(params: WriteFileParams): Promise<ToolCallResult> {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(params.file_path);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(params.file_path, params.content, 'utf-8');

    return {
      success: true,
      data: {
        file_path: params.file_path,
        bytes_written: Buffer.byteLength(params.content, 'utf-8'),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write file',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Edit file using string replacement
 */
export async function editFile(params: EditFileParams): Promise<ToolCallResult> {
  try {
    const content = await fs.readFile(params.file_path, 'utf-8');

    // Check if old_string exists
    if (!content.includes(params.old_string)) {
      return {
        success: false,
        error: `String not found in file: "${params.old_string.substring(0, 50)}..."`,
        timestamp: new Date().toISOString(),
      };
    }

    // Check if it's unique
    const occurrences = content.split(params.old_string).length - 1;
    if (occurrences > 1) {
      return {
        success: false,
        error: `String appears ${occurrences} times. Please provide a more specific string that appears exactly once.`,
        timestamp: new Date().toISOString(),
      };
    }

    // Perform replacement
    const newContent = content.replace(params.old_string, params.new_string);
    await fs.writeFile(params.file_path, newContent, 'utf-8');

    return {
      success: true,
      data: {
        file_path: params.file_path,
        changes: {
          old_length: params.old_string.length,
          new_length: params.new_string.length,
        },
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit file',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * List directory contents
 */
export async function listDirectory(params: ListDirectoryParams): Promise<ToolCallResult> {
  try {
    const targetPath = params.path ?? process.cwd();

    if (params.recursive) {
      // Recursive listing
      const files: string[] = [];
      const walk = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(targetPath, fullPath);
          files.push(entry.isDirectory() ? `${relativePath}/` : relativePath);
          if (entry.isDirectory()) {
            await walk(fullPath);
          }
        }
      };
      await walk(targetPath);
      files.sort();

      return {
        success: true,
        data: {
          path: targetPath,
          files,
          total: files.length,
        },
        timestamp: new Date().toISOString(),
      };
    } else {
      // Non-recursive
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const files = entries.map((entry) =>
        entry.isDirectory() ? `${entry.name}/` : entry.name
      );
      files.sort();

      return {
        success: true,
        data: {
          path: targetPath,
          files,
          total: files.length,
        },
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list directory',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Search for text in files
 */
export async function searchFiles(params: SearchFilesParams): Promise<ToolCallResult> {
  try {
    const targetPath = params.path ?? process.cwd();
    const results: Array<{ file: string; line: number; content: string }> = [];

    const search = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await search(fullPath);
          }
        } else {
          // Check file pattern
          if (params.file_pattern) {
            const pattern = params.file_pattern.replace(/\*/g, '.*');
            if (!new RegExp(pattern).test(entry.name)) {
              continue;
            }
          }

          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            const regex = new RegExp(params.pattern, 'gi');

            lines.forEach((line, idx) => {
              if (regex.test(line)) {
                results.push({
                  file: path.relative(targetPath, fullPath),
                  line: idx + 1,
                  content: line.trim(),
                });
              }
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    };

    await search(targetPath);

    return {
      success: true,
      data: {
        pattern: params.pattern,
        matches: results,
        total_matches: results.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search files',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Execute bash command
 */
export async function executeBash(params: BashParams): Promise<ToolCallResult> {
  try {
    const timeout = params.timeout ?? 30000;
    const cwd = params.cwd ?? process.cwd();

    const { stdout, stderr } = await execAsync(params.command, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    return {
      success: true,
      data: {
        command: params.command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        cwd,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorData =
      error instanceof Error && 'stdout' in error && 'stderr' in error
        ? { stdout: String((error as { stdout: unknown }).stdout || ''), stderr: String((error as { stderr: unknown }).stderr || '') }
        : undefined;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute command',
      data: errorData,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Execute code in various languages
 */
export async function executeCode(params: ExecuteCodeParams): Promise<ToolCallResult> {
  try {
    const timeout = params.timeout ?? 30000;
    let command: string;
    let tempFile: string | undefined;

    // Build command based on language
    switch (params.language) {
      case 'python':
        command = `python3 -c ${JSON.stringify(params.code)}`;
        break;

      case 'javascript':
        command = `node -e ${JSON.stringify(params.code)}`;
        break;

      case 'typescript':
        // TypeScript requires writing to a temp file and using tsx or ts-node
        tempFile = path.join('/tmp', `temp-${Date.now()}.ts`);
        await fs.writeFile(tempFile, params.code, 'utf-8');
        command = `npx tsx ${tempFile}`;
        break;

      case 'shell':
        command = params.code;
        break;

      default:
        return {
          success: false,
          error: `Unsupported language: ${params.language}`,
          timestamp: new Date().toISOString(),
        };
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    // Clean up temp file if created
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {
        /* ignore */
      });
    }

    return {
      success: true,
      data: {
        language: params.language,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: params.code.substring(0, 200), // Truncate for response
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorData =
      error instanceof Error && 'stdout' in error && 'stderr' in error
        ? {
            stdout: String((error as { stdout: unknown }).stdout || ''),
            stderr: String((error as { stderr: unknown }).stderr || ''),
          }
        : undefined;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute code',
      data: errorData,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Copy file or directory
 */
export async function copyFile(params: CopyFileParams): Promise<ToolCallResult> {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(params.destination);
    await fs.mkdir(destDir, { recursive: true });

    // Check if source is directory
    const stats = await fs.stat(params.source);
    if (stats.isDirectory()) {
      // Copy directory recursively
      await fs.cp(params.source, params.destination, { recursive: true });
    } else {
      await fs.copyFile(params.source, params.destination);
    }

    return {
      success: true,
      data: {
        source: params.source,
        destination: params.destination,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy file',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Move/rename file or directory
 */
export async function moveFile(params: MoveFileParams): Promise<ToolCallResult> {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(params.destination);
    await fs.mkdir(destDir, { recursive: true });

    await fs.rename(params.source, params.destination);

    return {
      success: true,
      data: {
        source: params.source,
        destination: params.destination,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move file',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Delete file or directory
 */
export async function deleteFile(params: DeleteFileParams): Promise<ToolCallResult> {
  try {
    const stats = await fs.stat(params.path);

    if (stats.isDirectory()) {
      await fs.rm(params.path, { recursive: true, force: true });
    } else {
      await fs.unlink(params.path);
    }

    return {
      success: true,
      data: {
        path: params.path,
        type: stats.isDirectory() ? 'directory' : 'file',
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create directory
 */
export async function createDirectory(params: CreateDirectoryParams): Promise<ToolCallResult> {
  try {
    await fs.mkdir(params.path, { recursive: params.recursive ?? true });

    return {
      success: true,
      data: {
        path: params.path,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create directory',
      timestamp: new Date().toISOString(),
    };
  }
}
