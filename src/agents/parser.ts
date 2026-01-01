/**
 * Agent markdown parser
 * Parses agent definition from markdown format
 */

import type { AgentDefinition, AgentMetadata } from '../types/agent.js';

/**
 * Parse agent from markdown content
 */
export function parseAgentMarkdown(content: string): AgentDefinition {
  // Extract frontmatter (YAML between ---)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    throw new Error('Invalid agent format: Missing frontmatter');
  }

  const frontmatter = frontmatterMatch[1]!;
  const body = content.substring(frontmatterMatch[0].length).trim();

  // Parse frontmatter
  const metadata = parseFrontmatter(frontmatter);

  // Parse body sections
  const sections = parseBodySections(body);

  return {
    metadata,
    context: sections.context || '',
    capabilities: sections.capabilities || [],
    instructions: sections.instructions || '',
    tools: sections.tools || [],
    examples: sections.examples,
    systemPrompt: sections.systemPrompt,
    constraints: sections.constraints,
  };
}

/**
 * Parse YAML frontmatter
 */
function parseFrontmatter(yaml: string): AgentMetadata {
  const lines = yaml.split('\n');
  const metadata: Partial<AgentMetadata> = {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (!key || valueParts.length === 0) continue;

    const value = valueParts.join(':').trim();
    const cleanKey = key.trim();

    switch (cleanKey) {
      case 'name':
        metadata.name = value;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'framework':
        metadata.framework = value;
        break;
      case 'language':
        metadata.language = value;
        break;
      case 'version':
        metadata.version = value;
        break;
      case 'author':
        metadata.author = value;
        break;
      case 'tags':
        metadata.tags = value.split(',').map(t => t.trim());
        break;
      case 'createdAt':
        metadata.createdAt = value;
        break;
      case 'updatedAt':
        metadata.updatedAt = value;
        break;
    }
  }

  if (!metadata.name || !metadata.description || !metadata.version) {
    throw new Error('Invalid agent: Missing required fields (name, description, version)');
  }

  return metadata as AgentMetadata;
}

/**
 * Parse body sections
 */
function parseBodySections(body: string): {
  context?: string;
  capabilities?: string[];
  instructions?: string;
  tools?: string[];
  examples?: string[];
  systemPrompt?: string;
  constraints?: string[];
} {
  const sections: ReturnType<typeof parseBodySections> = {};

  // Split by headers
  const headerRegex = /^##\s+(.+)$/gm;
  const parts: Array<{ header: string; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = headerRegex.exec(body)) !== null) {
    if (lastIndex > 0) {
      const previousMatch = parts[parts.length - 1];
      if (previousMatch) {
        previousMatch.content = body.substring(lastIndex, match.index).trim();
      }
    }

    parts.push({
      header: match[1]!.trim(),
      content: '',
    });

    lastIndex = match.index + match[0].length;
  }

  // Get content for last section
  if (parts.length > 0) {
    const last = parts[parts.length - 1]!;
    last.content = body.substring(lastIndex).trim();
  }

  // Parse sections
  for (const part of parts) {
    const header = part.header.toLowerCase();

    if (header === 'context') {
      sections.context = part.content;
    } else if (header === 'capabilities') {
      sections.capabilities = parseList(part.content);
    } else if (header === 'instructions') {
      sections.instructions = part.content;
    } else if (header === 'tools' || header === 'tools available') {
      sections.tools = parseList(part.content);
    } else if (header === 'examples' || header === 'example prompts') {
      sections.examples = parseList(part.content);
    } else if (header === 'system prompt') {
      sections.systemPrompt = part.content;
    } else if (header === 'constraints' || header === 'limitations') {
      sections.constraints = parseList(part.content);
    }
  }

  return sections;
}

/**
 * Parse markdown list
 */
function parseList(content: string): string[] {
  const lines = content.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      items.push(trimmed.substring(1).trim());
    } else if (trimmed.match(/^\d+\./)) {
      items.push(trimmed.replace(/^\d+\./, '').trim());
    }
  }

  return items;
}

/**
 * Generate agent markdown from definition
 */
export function generateAgentMarkdown(definition: AgentDefinition): string {
  const { metadata, context, capabilities, instructions, tools, examples, systemPrompt, constraints } = definition;

  let content = '---\n';
  content += `name: ${metadata.name}\n`;
  content += `description: ${metadata.description}\n`;
  if (metadata.framework) content += `framework: ${metadata.framework}\n`;
  if (metadata.language) content += `language: ${metadata.language}\n`;
  content += `version: ${metadata.version}\n`;
  if (metadata.author) content += `author: ${metadata.author}\n`;
  if (metadata.tags?.length) content += `tags: ${metadata.tags.join(', ')}\n`;
  content += `createdAt: ${metadata.createdAt}\n`;
  content += `updatedAt: ${metadata.updatedAt}\n`;
  content += '---\n\n';

  content += `# ${metadata.name}\n\n`;

  if (context) {
    content += `## Context\n\n${context}\n\n`;
  }

  if (capabilities.length > 0) {
    content += `## Capabilities\n\n`;
    capabilities.forEach(cap => {
      content += `- ${cap}\n`;
    });
    content += '\n';
  }

  if (instructions) {
    content += `## Instructions\n\n${instructions}\n\n`;
  }

  if (tools.length > 0) {
    content += `## Tools Available\n\n`;
    tools.forEach(tool => {
      content += `- ${tool}\n`;
    });
    content += '\n';
  }

  if (examples && examples.length > 0) {
    content += `## Example Prompts\n\n`;
    examples.forEach(example => {
      content += `- ${example}\n`;
    });
    content += '\n';
  }

  if (systemPrompt) {
    content += `## System Prompt\n\n${systemPrompt}\n\n`;
  }

  if (constraints && constraints.length > 0) {
    content += `## Constraints\n\n`;
    constraints.forEach(constraint => {
      content += `- ${constraint}\n`;
    });
    content += '\n';
  }

  return content;
}
