/**
 * Tool system type definitions
 * Defines the Model Context Protocol (MCP) interface
 */

export type ToolName =
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'list_directory'
  | 'search_files'
  | 'bash'
  | 'execute_code'
  | 'copy_file'
  | 'move_file'
  | 'delete_file'
  | 'create_directory';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: ToolParameter[];
  dangerous?: boolean; // Requires user confirmation
  needsSnapshot?: boolean; // Creates snapshot before execution
}

export interface ToolCallRequest {
  tool: ToolName;
  parameters: Record<string, unknown>;
  sessionId?: string | undefined;
}

export interface ToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string | undefined;
  snapshotId?: string | undefined; // If snapshot was created
  timestamp: string;
}

// Specific tool parameter types

export interface ReadFileParams {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface WriteFileParams {
  file_path: string;
  content: string;
}

export interface EditFileParams {
  file_path: string;
  old_string: string;
  new_string: string;
}

export interface ListDirectoryParams {
  path?: string;
  recursive?: boolean;
}

export interface SearchFilesParams {
  pattern: string;
  path?: string;
  file_pattern?: string;
}

export interface BashParams {
  command: string;
  timeout?: number;
  cwd?: string;
}

export interface ExecuteCodeParams {
  language: 'python' | 'javascript' | 'typescript' | 'shell';
  code: string;
  timeout?: number;
}

export interface CopyFileParams {
  source: string;
  destination: string;
}

export interface MoveFileParams {
  source: string;
  destination: string;
}

export interface DeleteFileParams {
  path: string;
}

export interface CreateDirectoryParams {
  path: string;
  recursive?: boolean;
}

// Tool execution context

export interface ToolContext {
  workingDirectory: string;
  sessionId?: string | undefined;
  allowDangerous: boolean;
  sandboxPaths?: string[] | undefined; // Allowed paths for file operations
  maxBashTimeout: number;
}

// Tool usage tracking

export interface ToolUsage {
  tool: ToolName;
  timestamp: string;
  success: boolean;
  executionTime: number;
  snapshotId?: string | undefined;
}
