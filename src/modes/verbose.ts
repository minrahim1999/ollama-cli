/**
 * Verbose/Extended Thinking Mode
 * Enables detailed reasoning and step-by-step explanations
 */

import type { Message } from '../types/index.js';
import { isVerboseMode } from './permission.js';

/**
 * Get verbose mode system prompt addition
 */
export function getVerboseSystemPrompt(): string {
  return `

## Extended Thinking Mode

You are currently in extended thinking mode. When responding:

1. **Show Your Reasoning**: Explain your thought process step-by-step
2. **Break Down Complex Tasks**: Decompose problems into smaller steps
3. **Explain Decisions**: Justify why you chose a particular approach
4. **Consider Alternatives**: Mention other options you considered
5. **Be Thorough**: Provide comprehensive explanations, not just answers

Structure your responses with:
- **Analysis**: What you understand about the task
- **Approach**: Your planned solution strategy
- **Implementation**: The actual solution
- **Validation**: How you verified correctness

Be verbose and detailed in your explanations.`;
}

/**
 * Augment messages with verbose system prompt if enabled
 */
export function augmentMessagesForVerbose(messages: Message[]): Message[] {
  if (!isVerboseMode()) {
    return messages;
  }

  // Find existing system message or create one
  const systemMessageIndex = messages.findIndex((m) => m.role === 'system');

  if (systemMessageIndex >= 0) {
    // Append to existing system message
    const updatedMessages = [...messages];
    const systemMessage = updatedMessages[systemMessageIndex]!;
    updatedMessages[systemMessageIndex] = {
      ...systemMessage,
      content: systemMessage.content + getVerboseSystemPrompt(),
    };
    return updatedMessages;
  } else {
    // Add new system message at the beginning
    return [
      {
        role: 'system',
        content: getVerboseSystemPrompt(),
      },
      ...messages,
    ];
  }
}

/**
 * Format verbose output with thinking sections
 */
export function formatVerboseResponse(response: string): string {
  if (!isVerboseMode()) {
    return response;
  }

  // Add visual indicators for verbose mode
  return `\n🧠 Extended Thinking Mode Active\n\n${response}\n`;
}

/**
 * Extract thinking sections from response
 */
export function extractThinkingSections(response: string): {
  thinking: string[];
  answer: string;
} {
  const sections: string[] = [];
  let answer = response;

  // Look for common thinking patterns
  const patterns = [
    /\*\*Analysis:\*\*\s*(.+?)(?=\*\*|$)/gs,
    /\*\*Approach:\*\*\s*(.+?)(?=\*\*|$)/gs,
    /\*\*Reasoning:\*\*\s*(.+?)(?=\*\*|$)/gs,
    /\*\*Thought:\*\*\s*(.+?)(?=\*\*|$)/gs,
  ];

  for (const pattern of patterns) {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        sections.push(match[1].trim());
      }
    }
  }

  return {
    thinking: sections,
    answer,
  };
}
