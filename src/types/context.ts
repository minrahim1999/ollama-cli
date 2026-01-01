/**
 * Context management types
 */

export interface ContextRule {
  type: 'include' | 'exclude';
  pattern: string; // glob pattern
}

export interface ContextConfig {
  rules: ContextRule[];
  tokenBudget?: number | undefined; // Max tokens for context
  autoSummarize: boolean; // Auto-summarize old messages
  includeFiles: boolean; // Include file contents in context
  maxMessageAge?: number | undefined; // Max age of messages in ms
}

export interface ContextStats {
  totalMessages: number;
  includedMessages: number;
  estimatedTokens: number;
  filesIncluded: number;
  rulesApplied: number;
}

export interface MessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  timestamp: number;
  included: boolean;
  reason?: string | undefined; // Why message was included/excluded
}
