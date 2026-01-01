/**
 * Agent creator
 * Auto-generates agent definitions using AI
 */

import { OllamaClient } from '../api/client.js';
import type { AgentDefinition, AgentCreateParams } from '../types/agent.js';
import { parseAgentMarkdown } from './parser.js';

/**
 * Auto-generate agent definition using AI
 */
export async function autoGenerateAgent(
  params: AgentCreateParams,
  baseUrl: string
): Promise<AgentDefinition> {
  const client = new OllamaClient(baseUrl);

  const prompt = buildGenerationPrompt(params);

  // Generate agent definition
  let fullResponse = '';

  for await (const chunk of client.chat({
    model: 'llama3.2', // Use default model
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  })) {
    fullResponse += chunk;
  }

  // Parse the generated markdown
  try {
    return parseAgentMarkdown(fullResponse);
  } catch (error) {
    throw new Error(`Failed to parse generated agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build AI generation prompt
 */
function buildGenerationPrompt(params: AgentCreateParams): string {
  return `Generate an agent definition in markdown format for a specialized AI assistant.

Agent Name: ${params.name}
Description: ${params.description}
${params.framework ? `Framework: ${params.framework}` : ''}
${params.language ? `Language: ${params.language}` : ''}

The agent definition must follow this exact format:

---
name: ${params.name}
description: ${params.description}
${params.framework ? `framework: ${params.framework}\n` : ''}${params.language ? `language: ${params.language}\n` : ''}version: 1.0.0
author: AI Generated
createdAt: ${new Date().toISOString()}
updatedAt: ${new Date().toISOString()}
---

# ${params.name}

## Context

[Write a detailed context explaining what this agent specializes in, its expertise, and when it should be used. Be specific about the domain knowledge it has.]

## Capabilities

- [List specific capabilities this agent has]
- [Each capability should be concrete and actionable]
- [Include 5-10 capabilities]

## Instructions

[Write detailed instructions on how this agent should behave, including:
1. Best practices it should follow
2. Coding standards or conventions
3. Specific methodologies or patterns
4. Quality standards
5. Common pitfalls to avoid]

## Tools Available

- read_file
- write_file
- edit_file
- bash
${params.framework === 'laravel' ? '- php artisan commands\n' : ''}${params.language ? `- ${params.language} code execution\n` : ''}

## Example Prompts

- [Provide 5-7 example prompts that users might ask this agent]
- [Make them specific to the agent's domain]
- [Include both simple and complex examples]

## Constraints

- [List any limitations or constraints]
- [What the agent should NOT do]
- [Scope boundaries]

Now generate the complete agent definition following this format exactly.`;
}

/**
 * Create manual agent template
 */
export function createAgentTemplate(params: AgentCreateParams): AgentDefinition {
  return {
    metadata: {
      name: params.name,
      description: params.description,
      framework: params.framework,
      language: params.language,
      version: '1.0.0',
      author: 'Manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    context: `You are a specialized assistant for ${params.description}.

[Add detailed context here about the agent's expertise and domain knowledge]`,
    capabilities: [
      'Capability 1 - describe what the agent can do',
      'Capability 2 - be specific and actionable',
      'Capability 3 - add more as needed',
    ],
    instructions: `When working on tasks:

1. Follow best practices for ${params.framework || params.language || 'the domain'}
2. Write clean, maintainable code
3. Provide clear explanations
4. Consider edge cases
5. Test thoroughly

[Add more detailed instructions here]`,
    tools: [
      'read_file',
      'write_file',
      'edit_file',
      'bash',
    ],
    examples: [
      'Example prompt 1',
      'Example prompt 2',
      'Example prompt 3',
    ],
    constraints: [
      'Only work within the specified framework/language',
      'Follow established conventions',
      'Maintain code quality standards',
    ],
  };
}
