/**
 * Tool executor - Handles tool execution with safety checks and snapshots
 */

import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import type {
  ToolCallRequest,
  ToolCallResult,
  ToolContext,
  ToolUsage,
  ReadFileParams,
  WriteFileParams,
  EditFileParams,
  ListDirectoryParams,
  SearchFilesParams,
  BashParams,
  CopyFileParams,
  MoveFileParams,
  DeleteFileParams,
  CreateDirectoryParams,
} from '../types/tools.js';
import { getToolDefinition, validateToolParameters } from './registry.js';
import {
  readFile,
  writeFile,
  editFile,
  listDirectory,
  searchFiles,
  executeBash,
  copyFile,
  moveFile,
  deleteFile,
  createDirectory,
} from './implementations.js';
import { createSnapshot } from '../memory/index.js';

export class ToolExecutor {
  private context: ToolContext;
  private usageHistory: ToolUsage[] = [];

  constructor(context: ToolContext) {
    this.context = context;
  }

  /**
   * Execute a tool call
   */
  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const startTime = Date.now();
    const definition = getToolDefinition(request.tool);

    if (!definition) {
      return {
        success: false,
        error: `Unknown tool: ${request.tool}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate parameters
    const validation = validateToolParameters(request.tool, request.parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        timestamp: new Date().toISOString(),
      };
    }

    // Safety checks
    const safetyCheck = this.performSafetyChecks(request);
    if (!safetyCheck.safe) {
      return {
        success: false,
        error: safetyCheck.reason,
        timestamp: new Date().toISOString(),
      };
    }

    // User confirmation for dangerous tools
    if (definition.dangerous && this.context.allowDangerous) {
      const confirmed = await this.confirmDangerousOperation(request);
      if (!confirmed) {
        return {
          success: false,
          error: 'Operation cancelled by user',
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Create snapshot before file-modifying operations
    let snapshotId: string | undefined;
    if (definition.needsSnapshot) {
      try {
        const snapshot = await createSnapshot({
          reason: `Before ${request.tool}`,
          sessionId: request.sessionId,
          files: this.getAffectedFiles(request),
          workingDirectory: this.context.workingDirectory,
        });
        snapshotId = snapshot.id;
      } catch (error) {
        console.error(chalk.yellow('Warning: Failed to create snapshot'));
      }
    }

    // Execute the tool
    let result: ToolCallResult;
    try {
      result = await this.executeToolImplementation(request);
      result.snapshotId = snapshotId;
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        timestamp: new Date().toISOString(),
      };
    }

    // Record usage
    const executionTime = Date.now() - startTime;
    this.usageHistory.push({
      tool: request.tool,
      timestamp: new Date().toISOString(),
      success: result.success,
      executionTime,
      snapshotId,
    });

    return result;
  }

  /**
   * Execute the actual tool implementation
   */
  private async executeToolImplementation(
    request: ToolCallRequest
  ): Promise<ToolCallResult> {
    switch (request.tool) {
      case 'read_file':
        return readFile(request.parameters as unknown as ReadFileParams);
      case 'write_file':
        return writeFile(request.parameters as unknown as WriteFileParams);
      case 'edit_file':
        return editFile(request.parameters as unknown as EditFileParams);
      case 'list_directory':
        return listDirectory(request.parameters as unknown as ListDirectoryParams);
      case 'search_files':
        return searchFiles(request.parameters as unknown as SearchFilesParams);
      case 'bash':
        return executeBash(request.parameters as unknown as BashParams);
      case 'copy_file':
        return copyFile(request.parameters as unknown as CopyFileParams);
      case 'move_file':
        return moveFile(request.parameters as unknown as MoveFileParams);
      case 'delete_file':
        return deleteFile(request.parameters as unknown as DeleteFileParams);
      case 'create_directory':
        return createDirectory(request.parameters as unknown as CreateDirectoryParams);
      default:
        return {
          success: false,
          error: `Unimplemented tool: ${request.tool}`,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Perform safety checks
   */
  private performSafetyChecks(
    request: ToolCallRequest
  ): { safe: boolean; reason?: string | undefined } {
    // Check sandbox paths
    if (this.context.sandboxPaths && this.context.sandboxPaths.length > 0) {
      const filePath = this.extractFilePath(request);
      if (filePath) {
        const absolutePath = path.resolve(this.context.workingDirectory, filePath);
        const isAllowed = this.context.sandboxPaths.some((allowedPath) =>
          absolutePath.startsWith(path.resolve(allowedPath))
        );

        if (!isAllowed) {
          return {
            safe: false,
            reason: `Access denied: ${filePath} is outside allowed paths`,
          };
        }
      }
    }

    // Prevent deleting critical paths
    if (request.tool === 'delete_file' || request.tool === 'move_file') {
      const targetPath = String(request.parameters.path || request.parameters.source || '');
      const critical = [
        '/',
        '/etc',
        '/usr',
        '/bin',
        '/sbin',
        '/home',
        process.env['HOME'] || '',
      ];

      if (critical.some((p) => path.resolve(targetPath) === p)) {
        return {
          safe: false,
          reason: `Refusing to modify critical system path: ${targetPath}`,
        };
      }
    }

    // Prevent dangerous bash commands
    if (request.tool === 'bash') {
      const command = String(request.parameters.command || '');
      const dangerous = [
        'rm -rf /',
        'mkfs',
        'dd if=',
        'fork bomb',
        ':(){ :|:& };:',
      ];

      if (dangerous.some((d) => command.includes(d))) {
        return {
          safe: false,
          reason: 'Refusing to execute potentially dangerous command',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Confirm dangerous operation with user
   */
  private async confirmDangerousOperation(request: ToolCallRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log(chalk.yellow('\n⚠️  Dangerous operation requested:'));
      console.log(chalk.white(`Tool: ${request.tool}`));
      console.log(chalk.white(`Parameters: ${JSON.stringify(request.parameters, null, 2)}`));

      rl.question(chalk.cyan('\nAllow this operation? (yes/no): '), (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Extract file path from request parameters
   */
  private extractFilePath(request: ToolCallRequest): string | undefined {
    const params = request.parameters;
    if (params.file_path && typeof params.file_path === 'string') {
      return params.file_path;
    }
    if (params.path && typeof params.path === 'string') {
      return params.path;
    }
    if (params.source && typeof params.source === 'string') {
      return params.source;
    }
    return undefined;
  }

  /**
   * Get list of files affected by this operation
   */
  private getAffectedFiles(request: ToolCallRequest): string[] {
    const files: string[] = [];

    if (request.parameters.file_path && typeof request.parameters.file_path === 'string') {
      files.push(request.parameters.file_path);
    }
    if (request.parameters.path && typeof request.parameters.path === 'string') {
      files.push(request.parameters.path);
    }
    if (request.parameters.source && typeof request.parameters.source === 'string') {
      files.push(request.parameters.source);
    }
    if (request.parameters.destination && typeof request.parameters.destination === 'string') {
      files.push(request.parameters.destination);
    }

    return files;
  }

  /**
   * Get tool usage statistics
   */
  getUsageStats(): {
    totalCalls: number;
    successRate: number;
    toolUsage: Record<string, number>;
  } {
    const totalCalls = this.usageHistory.length;
    const successCount = this.usageHistory.filter((u) => u.success).length;
    const toolUsage: Record<string, number> = {};

    for (const usage of this.usageHistory) {
      toolUsage[usage.tool] = (toolUsage[usage.tool] || 0) + 1;
    }

    return {
      totalCalls,
      successRate: totalCalls > 0 ? successCount / totalCalls : 0,
      toolUsage,
    };
  }
}
