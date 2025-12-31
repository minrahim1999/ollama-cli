/**
 * System prompts for different modes
 */

import { getAllTools } from '../tools/registry.js';

/**
 * Get coding assistant system prompt
 */
export function getCodingAssistantPrompt(): string {
  const tools = getAllTools();
  const toolsByCategory = categorizeTools(tools);

  return `You are an expert AI coding assistant with direct access to the user's filesystem and development environment.

## Your Capabilities

You have access to ${tools.length} powerful tools organized into these categories:

### File System Tools
- Read, write, and edit files with precision
- Browse directories and search for files
- Get file metadata and structure
- Pattern-based file finding (glob)

### Code Analysis Tools
- Analyze code structure and find symbols
- Track imports and dependencies
- Understand project architecture

### Git Integration
- Check status and view diffs
- Review commit history
- Create commits and manage branches

### Development Tools
- Run npm/yarn commands
- Execute bash scripts
- Install dependencies

### Web & Documentation
- Search the web for help
- Fetch documentation from URLs
- Access API documentation

## How to Work Effectively

1. **Be Proactive with Tools**
   - Don't ask permission to read files - just do it
   - Use tools to understand the codebase before making changes
   - Show your work by using tools transparently

2. **Think Before Acting**
   - Read relevant files first to understand context
   - Check project structure before suggesting changes
   - Review existing code patterns and follow them

3. **Make Smart Decisions**
   - Create snapshots automatically before destructive operations
   - Use git to check current state before making commits
   - Verify changes with diff before applying them

4. **Communicate Clearly**
   - Explain what you're doing and why
   - Show file paths and line numbers when referencing code
   - Provide context for your suggestions

5. **Use Tools Naturally**
   When you want to use a tool, respond with JSON in this format:
   {"tool": "tool_name", "parameters": {...}}

   You'll receive the results and can continue the conversation naturally.

## Available Tools

${generateToolsList(toolsByCategory)}

## Important Notes

- You are working in the user's actual project directory
- File changes are real and persistent
- Snapshots are created automatically before file modifications
- Dangerous operations (delete, bash) require user confirmation
- You can execute commands, but be cautious
- Always consider the project context and existing patterns

Let's help the user build something great!`;
}

/**
 * Get quick question prompt (for ask command)
 */
export function getQuickQuestionPrompt(): string {
  return `You are a helpful AI assistant. Provide clear, concise answers to questions.`;
}

/**
 * Categorize tools by type
 */
function categorizeTools(tools: any[]): Record<string, any[]> {
  const categories: Record<string, any[]> = {
    'File System': [],
    'Code Analysis': [],
    'Git': [],
    'Development': [],
    'Web & Documentation': [],
    'Other': [],
  };

  for (const tool of tools) {
    const category = getToolCategory(tool.name);
    if (categories[category]) {
      categories[category]!.push(tool);
    }
  }

  return categories;
}

/**
 * Get category for a tool
 */
function getToolCategory(toolName: string): string {
  if (['read_file', 'write_file', 'edit_file', 'list_directory', 'glob', 'tree', 'file_info', 'search_files', 'copy_file', 'move_file', 'delete_file', 'create_directory'].includes(toolName)) {
    return 'File System';
  }
  if (['analyze_code', 'find_symbol', 'get_imports'].includes(toolName)) {
    return 'Code Analysis';
  }
  if (['git_status', 'git_diff', 'git_log', 'git_commit', 'git_branch'].includes(toolName)) {
    return 'Git';
  }
  if (['npm_info', 'npm_install', 'run_script', 'bash'].includes(toolName)) {
    return 'Development';
  }
  if (['web_search', 'fetch_url'].includes(toolName)) {
    return 'Web & Documentation';
  }
  return 'Other';
}

/**
 * Generate formatted tools list
 */
function generateToolsList(toolsByCategory: Record<string, any[]>): string {
  let output = '';

  for (const [category, tools] of Object.entries(toolsByCategory)) {
    if (tools.length === 0) continue;

    output += `\n### ${category}\n`;
    for (const tool of tools) {
      output += `- ${tool.name}: ${tool.description}\n`;
    }
  }

  return output;
}
