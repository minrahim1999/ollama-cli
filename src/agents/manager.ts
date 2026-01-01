/**
 * Agent manager
 * Handles agent CRUD operations and storage
 */

import fs from 'fs/promises';
import path from 'path';
import type { AgentDefinition, AgentListItem, AgentFile } from '../types/agent.js';
import { parseAgentMarkdown, generateAgentMarkdown } from './parser.js';

const GLOBAL_AGENTS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.ollama-cli',
  'agents'
);

/**
 * Get agents directory (project or global)
 */
function getAgentsDir(scope: 'global' | 'project'): string {
  if (scope === 'global') {
    return GLOBAL_AGENTS_DIR;
  } else {
    return path.join(process.cwd(), '.ollama', 'agents');
  }
}

/**
 * List all available agents
 */
export async function listAgents(): Promise<AgentListItem[]> {
  const agents: AgentListItem[] = [];

  // List global agents
  try {
    await fs.mkdir(GLOBAL_AGENTS_DIR, { recursive: true });
    const globalFiles = await fs.readdir(GLOBAL_AGENTS_DIR);

    for (const file of globalFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(GLOBAL_AGENTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');

        try {
          const definition = parseAgentMarkdown(content);
          agents.push({
            name: definition.metadata.name,
            description: definition.metadata.description,
            framework: definition.metadata.framework,
            type: 'global',
            path: filePath,
          });
        } catch {
          // Skip invalid agents
        }
      }
    }
  } catch {
    // No global agents
  }

  // List project agents
  try {
    const projectDir = path.join(process.cwd(), '.ollama', 'agents');
    await fs.mkdir(projectDir, { recursive: true });
    const projectFiles = await fs.readdir(projectDir);

    for (const file of projectFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(projectDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        try {
          const definition = parseAgentMarkdown(content);
          agents.push({
            name: definition.metadata.name,
            description: definition.metadata.description,
            framework: definition.metadata.framework,
            type: 'project',
            path: filePath,
          });
        } catch {
          // Skip invalid agents
        }
      }
    }
  } catch {
    // No project agents
  }

  return agents;
}

/**
 * Load agent by name
 */
export async function loadAgent(name: string, scope?: 'global' | 'project'): Promise<AgentFile | null> {
  const agents = await listAgents();

  // Filter by scope if specified
  const filtered = scope ? agents.filter(a => a.type === scope) : agents;

  // Find by name
  const agent = filtered.find(a => a.name === name);

  if (!agent) {
    return null;
  }

  const content = await fs.readFile(agent.path, 'utf-8');
  const definition = parseAgentMarkdown(content);

  return {
    path: agent.path,
    type: agent.type,
    definition,
  };
}

/**
 * Save agent
 */
export async function saveAgent(
  definition: AgentDefinition,
  scope: 'global' | 'project'
): Promise<string> {
  const dir = getAgentsDir(scope);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${definition.metadata.name}.md`;
  const filePath = path.join(dir, filename);

  // Update timestamp
  definition.metadata.updatedAt = new Date().toISOString();

  const content = generateAgentMarkdown(definition);
  await fs.writeFile(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Delete agent
 */
export async function deleteAgent(name: string, scope: 'global' | 'project'): Promise<boolean> {
  const agent = await loadAgent(name, scope);

  if (!agent) {
    return false;
  }

  await fs.unlink(agent.path);
  return true;
}

/**
 * Check if agent exists
 */
export async function agentExists(name: string, scope?: 'global' | 'project'): Promise<boolean> {
  const agent = await loadAgent(name, scope);
  return agent !== null;
}

/**
 * Get agent system prompt
 */
export function getAgentSystemPrompt(definition: AgentDefinition): string {
  if (definition.systemPrompt) {
    return definition.systemPrompt;
  }

  // Generate from definition
  let prompt = `# ${definition.metadata.name}\n\n`;
  prompt += `${definition.metadata.description}\n\n`;

  if (definition.context) {
    prompt += `## Context\n${definition.context}\n\n`;
  }

  if (definition.capabilities.length > 0) {
    prompt += `## Your Capabilities\n`;
    definition.capabilities.forEach(cap => {
      prompt += `- ${cap}\n`;
    });
    prompt += '\n';
  }

  if (definition.instructions) {
    prompt += `## Instructions\n${definition.instructions}\n\n`;
  }

  if (definition.constraints && definition.constraints.length > 0) {
    prompt += `## Constraints\n`;
    definition.constraints.forEach(constraint => {
      prompt += `- ${constraint}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}
