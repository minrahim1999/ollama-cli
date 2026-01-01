/**
 * Tool registry - Manages available tools and their definitions
 */

import type { ToolDefinition, ToolName } from '../types/tools.js';

export const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  read_file: {
    name: 'read_file',
    description: 'Read file contents with optional line range',
    parameters: [
      {
        name: 'file_path',
        type: 'string',
        description: 'Path to the file to read',
        required: true,
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Line number to start reading from (1-based)',
        required: false,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Number of lines to read',
        required: false,
      },
    ],
    dangerous: false,
    needsSnapshot: false,
  },

  write_file: {
    name: 'write_file',
    description: 'Create or overwrite a file with content',
    parameters: [
      {
        name: 'file_path',
        type: 'string',
        description: 'Path to the file to write',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'Content to write to the file',
        required: true,
      },
    ],
    dangerous: false,
    needsSnapshot: true,
  },

  edit_file: {
    name: 'edit_file',
    description: 'Make precise edits to a file using string replacement',
    parameters: [
      {
        name: 'file_path',
        type: 'string',
        description: 'Path to the file to edit',
        required: true,
      },
      {
        name: 'old_string',
        type: 'string',
        description: 'Exact string to find and replace',
        required: true,
      },
      {
        name: 'new_string',
        type: 'string',
        description: 'String to replace with',
        required: true,
      },
    ],
    dangerous: false,
    needsSnapshot: true,
  },

  list_directory: {
    name: 'list_directory',
    description: 'List files and directories',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Path to list (default: current directory)',
        required: false,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'List recursively',
        required: false,
        default: false,
      },
    ],
    dangerous: false,
    needsSnapshot: false,
  },

  search_files: {
    name: 'search_files',
    description: 'Search for text patterns in files',
    parameters: [
      {
        name: 'pattern',
        type: 'string',
        description: 'Search pattern (regex supported)',
        required: true,
      },
      {
        name: 'path',
        type: 'string',
        description: 'Path to search in (default: current directory)',
        required: false,
      },
      {
        name: 'file_pattern',
        type: 'string',
        description: 'File pattern to filter (e.g., "*.ts")',
        required: false,
      },
    ],
    dangerous: false,
    needsSnapshot: false,
  },

  bash: {
    name: 'bash',
    description: 'Execute a shell command',
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'Shell command to execute',
        required: true,
      },
      {
        name: 'timeout',
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
        required: false,
        default: 30000,
      },
      {
        name: 'cwd',
        type: 'string',
        description: 'Working directory for command',
        required: false,
      },
    ],
    dangerous: true,
    needsSnapshot: false,
  },

  execute_code: {
    name: 'execute_code',
    description: 'Execute code in various languages (Python, JavaScript, TypeScript, Shell)',
    parameters: [
      {
        name: 'language',
        type: 'string',
        description: 'Programming language (python|javascript|typescript|shell)',
        required: true,
      },
      {
        name: 'code',
        type: 'string',
        description: 'Code to execute',
        required: true,
      },
      {
        name: 'timeout',
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
        required: false,
        default: 30000,
      },
    ],
    dangerous: true,
    needsSnapshot: false,
  },

  copy_file: {
    name: 'copy_file',
    description: 'Copy a file or directory',
    parameters: [
      {
        name: 'source',
        type: 'string',
        description: 'Source path',
        required: true,
      },
      {
        name: 'destination',
        type: 'string',
        description: 'Destination path',
        required: true,
      },
    ],
    dangerous: false,
    needsSnapshot: true,
  },

  move_file: {
    name: 'move_file',
    description: 'Move or rename a file or directory',
    parameters: [
      {
        name: 'source',
        type: 'string',
        description: 'Source path',
        required: true,
      },
      {
        name: 'destination',
        type: 'string',
        description: 'Destination path',
        required: true,
      },
    ],
    dangerous: false,
    needsSnapshot: true,
  },

  delete_file: {
    name: 'delete_file',
    description: 'Delete a file or directory',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Path to delete',
        required: true,
      },
    ],
    dangerous: true,
    needsSnapshot: true,
  },

  create_directory: {
    name: 'create_directory',
    description: 'Create a new directory',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Path of directory to create',
        required: true,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Create parent directories if needed',
        required: false,
        default: true,
      },
    ],
    dangerous: false,
    needsSnapshot: false,
  },
};

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: ToolName): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[name];
}

/**
 * Get all available tools
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS);
}

/**
 * Get tools formatted for LLM prompt
 */
export function getToolsPrompt(): string {
  const tools = getAllTools();
  let prompt = 'Available tools:\n\n';

  for (const tool of tools) {
    prompt += `## ${tool.name}\n`;
    prompt += `${tool.description}\n`;
    if (tool.dangerous) {
      prompt += '⚠️  Requires user confirmation\n';
    }
    prompt += '\nParameters:\n';
    for (const param of tool.parameters) {
      const required = param.required ? '(required)' : '(optional)';
      prompt += `- ${param.name} ${required}: ${param.description}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}

/**
 * Validate tool parameters
 */
export function validateToolParameters(
  toolName: ToolName,
  parameters: Record<string, unknown>
): { valid: boolean; error?: string } {
  const definition = getToolDefinition(toolName);
  if (!definition) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  // Check required parameters
  for (const param of definition.parameters) {
    if (param.required && !(param.name in parameters)) {
      return {
        valid: false,
        error: `Missing required parameter: ${param.name}`,
      };
    }
  }

  return { valid: true };
}
