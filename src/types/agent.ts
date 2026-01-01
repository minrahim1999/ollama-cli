/**
 * Agent system type definitions
 * Agents are specialized assistants for specific frameworks/tasks
 */

export interface AgentMetadata {
  name: string;
  description: string;
  framework?: string | undefined; // laravel, react, django, etc.
  language?: string | undefined; // php, javascript, python, etc.
  version: string;
  author?: string | undefined;
  tags?: string[] | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinition {
  metadata: AgentMetadata;
  context: string; // Main instruction/context for the agent
  capabilities: string[]; // List of capabilities
  instructions: string; // Detailed instructions
  tools: string[]; // Allowed tools
  examples?: string[] | undefined; // Example prompts/conversations
  systemPrompt?: string | undefined; // Custom system prompt
  constraints?: string[] | undefined; // Limitations/constraints
}

export interface AgentFile {
  path: string;
  type: 'global' | 'project';
  definition: AgentDefinition;
}

export interface AgentCreateParams {
  name: string;
  description: string;
  framework?: string | undefined;
  language?: string | undefined;
  auto?: boolean; // Auto-generate from description
  scope: 'global' | 'project';
}

export interface AgentListItem {
  name: string;
  description: string;
  framework?: string | undefined;
  type: 'global' | 'project';
  path: string;
}
