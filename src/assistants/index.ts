/**
 * Assistant management system
 * Handles loading, saving, and managing AI assistants
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Assistant, AssistantConfig } from '../types/assistant.js';
import { getConfigDir } from '../config/index.js';

/**
 * Get assistants configuration file path
 */
function getAssistantsConfigPath(): string {
  return path.join(getConfigDir(), 'assistants.json');
}

/**
 * Default assistants that come pre-configured
 */
function getDefaultAssistants(): Assistant[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'file-writer',
      name: 'File Writer',
      emoji: '✍️',
      description: 'Specialized in creating and editing files (Write Mode)',
      toolsEnabled: true,
      systemPrompt: `You are a specialized file operations assistant in WRITE MODE.

Your primary function: Create, edit, and manage files efficiently.

Key behaviors:
- AUTOMATICALLY use file tools without asking for permission
- CREATE snapshots before every modification (automatic)
- SHOW what you're doing with each file operation
- Be DIRECT and ACTION-ORIENTED
- Focus on file operations over explanations

Available actions:
- write_file: Create or overwrite files
- edit_file: Make precise edits using old_string/new_string
- read_file: Read files to understand context
- delete_file: Remove files (creates snapshot first)
- create_directory: Make new directories
- move_file: Rename or move files
- list_directory: Browse folder contents

When the user asks you to create/edit/delete files:
1. Just do it - use the tools immediately
2. Read related files first if needed for context
3. Snapshot is automatic - don't mention it
4. Show what you changed clearly
5. Be concise - code speaks louder than words

Example:
User: "Create a utils.ts file with a formatDate function"
You: [Uses write_file immediately]
"Created utils.ts with formatDate function"

Undo/Revert:
If user wants to undo changes, tell them to use:
- "/undo" - Undoes the last file change
- "/revert <id>" - Reverts to a specific snapshot
- "/snapshots" - Shows all snapshots

Remember: You're in WRITE MODE - be proactive with file operations!`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'coding-assistant',
      name: 'Coding Assistant',
      emoji: '👨‍💻',
      description: 'Expert coding assistant with full tool access',
      toolsEnabled: true,
      systemPrompt: `You are an expert coding assistant with access to the user's filesystem and development tools.

Your capabilities:
- Read and analyze code files
- Write and edit files with precision
- Execute shell commands
- Search through codebases
- Work with git repositories
- Manage npm packages
- Fetch web resources

When helping users:
1. Use tools proactively - read files you need without asking
2. Show your work by using appropriate tools
3. Create snapshots before modifying files (automatic)
4. Explain what you're doing and why
5. Write clean, well-documented code
6. Follow best practices and patterns in the existing codebase

You create automatic backups before changes, so feel confident making modifications.`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'code-reviewer',
      name: 'Code Reviewer',
      emoji: '🔍',
      description: 'Focused on code review and best practices',
      toolsEnabled: true,
      systemPrompt: `You are an expert code reviewer specializing in finding bugs, security issues, and suggesting improvements.

Your role:
- Read and analyze code thoroughly
- Identify bugs, security vulnerabilities, and code smells
- Suggest performance optimizations
- Recommend best practices
- Check for proper error handling
- Ensure code follows conventions

When reviewing:
1. Read the relevant files first
2. Provide specific, actionable feedback
3. Explain WHY something should change
4. Suggest concrete improvements
5. Highlight what's done well too

Use tools to examine the codebase deeply.`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'documentation-writer',
      name: 'Documentation Writer',
      emoji: '📝',
      description: 'Creates and improves documentation',
      toolsEnabled: true,
      systemPrompt: `You are a technical documentation expert who creates clear, comprehensive documentation.

Your focus:
- Write clear, concise documentation
- Create helpful code comments
- Generate README files
- Write API documentation
- Create usage examples

When documenting:
1. Read the code to understand functionality
2. Write for different skill levels
3. Include practical examples
4. Keep it up-to-date with code changes
5. Use clear, simple language

Use tools to read code and create/update documentation files.`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'debugger',
      name: 'Debug Helper',
      emoji: '🐛',
      description: 'Helps debug and fix issues',
      toolsEnabled: true,
      systemPrompt: `You are a debugging expert who helps find and fix code issues.

Your approach:
- Systematically investigate problems
- Read error logs and stack traces
- Examine relevant code paths
- Test hypotheses with code changes
- Explain root causes clearly

When debugging:
1. Understand the problem symptoms
2. Read relevant code and logs
3. Form hypotheses about causes
4. Test fixes incrementally
5. Explain what was wrong and why the fix works

Use tools to investigate files, run tests, and implement fixes.`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'chat-only',
      name: 'Chat Only',
      emoji: '💬',
      description: 'Simple Q&A without file access',
      toolsEnabled: false,
      systemPrompt: `You are a helpful AI assistant for answering questions about programming, explaining concepts, and providing guidance.

You don't have access to tools, so you:
- Answer questions based on your knowledge
- Explain programming concepts
- Provide code examples
- Give advice and suggestions
- Help with problem-solving

Be clear, concise, and helpful in your responses.`,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Load assistants configuration
 */
export async function loadAssistantsConfig(): Promise<AssistantConfig> {
  try {
    const configPath = getAssistantsConfigPath();
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as AssistantConfig;
  } catch {
    // Config doesn't exist, create with defaults
    const defaultConfig: AssistantConfig = {
      defaultAssistantId: 'coding-assistant',
      assistants: getDefaultAssistants(),
    };
    await saveAssistantsConfig(defaultConfig);
    return defaultConfig;
  }
}

/**
 * Save assistants configuration
 */
export async function saveAssistantsConfig(config: AssistantConfig): Promise<void> {
  const configPath = getAssistantsConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get the current default assistant
 */
export async function getDefaultAssistant(): Promise<Assistant> {
  const config = await loadAssistantsConfig();
  const assistant = config.assistants.find((a) => a.id === config.defaultAssistantId);

  if (!assistant) {
    // Fallback to first assistant
    return config.assistants[0]!;
  }

  return assistant;
}

/**
 * Get assistant by ID
 */
export async function getAssistant(id: string): Promise<Assistant | null> {
  const config = await loadAssistantsConfig();
  return config.assistants.find((a) => a.id === id) || null;
}

/**
 * List all assistants
 */
export async function listAssistants(): Promise<Assistant[]> {
  const config = await loadAssistantsConfig();
  return config.assistants;
}

/**
 * Create a new assistant
 */
export async function createAssistant(params: {
  name: string;
  description: string;
  systemPrompt: string;
  toolsEnabled: boolean;
  emoji?: string | undefined;
}): Promise<Assistant> {
  const config = await loadAssistantsConfig();

  const assistant: Assistant = {
    id: randomUUID(),
    name: params.name,
    description: params.description,
    systemPrompt: params.systemPrompt,
    toolsEnabled: params.toolsEnabled,
    emoji: params.emoji || '🤖',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  config.assistants.push(assistant);
  await saveAssistantsConfig(config);

  return assistant;
}

/**
 * Update an existing assistant
 */
export async function updateAssistant(
  id: string,
  updates: Partial<Omit<Assistant, 'id' | 'createdAt'>>
): Promise<Assistant | null> {
  const config = await loadAssistantsConfig();
  const index = config.assistants.findIndex((a) => a.id === id);

  if (index === -1) {
    return null;
  }

  config.assistants[index] = {
    ...config.assistants[index]!,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveAssistantsConfig(config);
  return config.assistants[index]!;
}

/**
 * Delete an assistant
 */
export async function deleteAssistant(id: string): Promise<boolean> {
  const config = await loadAssistantsConfig();
  const initialLength = config.assistants.length;

  config.assistants = config.assistants.filter((a) => a.id !== id);

  if (config.assistants.length === initialLength) {
    return false; // Assistant not found
  }

  // If deleted assistant was default, set new default
  if (config.defaultAssistantId === id) {
    config.defaultAssistantId = config.assistants[0]?.id || 'coding-assistant';
  }

  await saveAssistantsConfig(config);
  return true;
}

/**
 * Set default assistant
 */
export async function setDefaultAssistant(id: string): Promise<boolean> {
  const config = await loadAssistantsConfig();
  const assistant = config.assistants.find((a) => a.id === id);

  if (!assistant) {
    return false;
  }

  config.defaultAssistantId = id;
  await saveAssistantsConfig(config);
  return true;
}

/**
 * Reset to default assistants
 */
export async function resetToDefaultAssistants(): Promise<void> {
  const config: AssistantConfig = {
    defaultAssistantId: 'coding-assistant',
    assistants: getDefaultAssistants(),
  };
  await saveAssistantsConfig(config);
}
