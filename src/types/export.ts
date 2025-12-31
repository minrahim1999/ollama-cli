/**
 * Export/Import types
 */

export interface ConversationExport {
  version: string; // "1.0.0"
  exportedAt: string; // ISO timestamp
  session: {
    id: string;
    name?: string | undefined;
    model: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: string | undefined; // When message was added
  }>;
  metadata: {
    totalMessages: number;
    assistant?: string | undefined; // Assistant name if any
  };
}

export type ExportFormat = 'json' | 'markdown' | 'txt';
