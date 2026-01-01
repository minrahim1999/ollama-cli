/**
 * Context management for conversations
 * Control what content is included in the conversation context
 */

import { minimatch } from 'minimatch';
import type { ContextConfig, ContextRule, ContextStats, MessageContext } from '../types/context.js';
import type { Message } from '../types/index.js';

/**
 * Default context configuration
 */
export function getDefaultContextConfig(): ContextConfig {
  return {
    rules: [],
    tokenBudget: undefined,
    autoSummarize: false,
    includeFiles: true,
    maxMessageAge: undefined,
  };
}

/**
 * Estimate token count for a string
 * Using rough approximation: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if a file path matches include/exclude rules
 */
export function matchesRules(filePath: string, rules: ContextRule[]): boolean {
  let included = false;

  for (const rule of rules) {
    const matches = minimatch(filePath, rule.pattern);

    if (matches) {
      if (rule.type === 'include') {
        included = true;
      } else if (rule.type === 'exclude') {
        included = false;
      }
    }
  }

  return included;
}

/**
 * Filter messages based on context configuration
 */
export function filterMessages(
  messages: Message[],
  config: ContextConfig
): MessageContext[] {
  const now = Date.now();
  const contexts: MessageContext[] = [];
  let totalTokens = 0;

  for (const message of messages) {
    const tokens = estimateTokens(message.content);
    const messageTime = new Date(message.timestamp || Date.now()).getTime();
    const age = now - messageTime;

    let included = true;
    let reason: string | undefined;

    // Check message age
    if (config.maxMessageAge && age > config.maxMessageAge) {
      included = false;
      reason = 'Message too old';
    }

    // Check token budget
    if (config.tokenBudget && totalTokens + tokens > config.tokenBudget) {
      included = false;
      reason = 'Token budget exceeded';
    }

    if (included) {
      totalTokens += tokens;
    }

    contexts.push({
      role: message.role,
      content: message.content,
      tokens,
      timestamp: messageTime,
      included,
      reason,
    });
  }

  return contexts;
}

/**
 * Get context statistics
 */
export function getContextStats(
  messages: Message[],
  config: ContextConfig
): ContextStats {
  const contexts = filterMessages(messages, config);
  const included = contexts.filter((c) => c.included);

  return {
    totalMessages: contexts.length,
    includedMessages: included.length,
    estimatedTokens: included.reduce((sum, c) => sum + c.tokens, 0),
    filesIncluded: 0, // TODO: Track file inclusions
    rulesApplied: config.rules.length,
  };
}

/**
 * Summarize old messages to save tokens
 */
export async function summarizeMessages(
  messages: Message[],
  keepRecent: number = 10
): Promise<Message[]> {
  if (messages.length <= keepRecent) {
    return messages;
  }

  const oldMessages = messages.slice(0, -keepRecent);
  const recentMessages = messages.slice(-keepRecent);

  // Create summary of old messages
  const summary = `[Previous conversation summary: ${oldMessages.length} messages exchanged about: ${
    extractTopics(oldMessages).join(', ')
  }]`;

  const summaryMessage: Message = {
    role: 'system',
    content: summary,
    timestamp: oldMessages[oldMessages.length - 1]?.timestamp || new Date().toISOString(),
  };

  return [summaryMessage, ...recentMessages];
}

/**
 * Extract topics from messages for summarization
 */
function extractTopics(messages: Message[]): string[] {
  const topics: Set<string> = new Set();

  for (const message of messages) {
    if (message.role === 'user') {
      // Extract first few words as topic
      const words = message.content.split(/\s+/).slice(0, 5);
      if (words.length > 0) {
        topics.add(words.join(' '));
      }
    }
  }

  return Array.from(topics).slice(0, 5);
}

/**
 * Apply context configuration to messages
 */
export function applyContextConfig(
  messages: Message[],
  config: ContextConfig
): Message[] {
  const contexts = filterMessages(messages, config);
  return contexts
    .filter((c) => c.included)
    .map((c) => ({
      role: c.role,
      content: c.content,
      timestamp: new Date(c.timestamp).toISOString(),
    }));
}

/**
 * Add a context rule
 */
export function addContextRule(
  config: ContextConfig,
  type: 'include' | 'exclude',
  pattern: string
): ContextConfig {
  return {
    ...config,
    rules: [
      ...config.rules,
      { type, pattern },
    ],
  };
}

/**
 * Remove a context rule by index
 */
export function removeContextRule(
  config: ContextConfig,
  index: number
): ContextConfig {
  return {
    ...config,
    rules: config.rules.filter((_, i) => i !== index),
  };
}

/**
 * Set token budget
 */
export function setTokenBudget(
  config: ContextConfig,
  budget: number | undefined
): ContextConfig {
  return {
    ...config,
    tokenBudget: budget,
  };
}
