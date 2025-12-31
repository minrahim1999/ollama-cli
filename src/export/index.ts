/**
 * Conversation export/import functionality
 */

import fs from 'fs/promises';
import path from 'path';
import type { ChatSession } from '../types/index.js';
import type { ConversationExport, ExportFormat } from '../types/export.js';
import { randomUUID } from 'crypto';

const EXPORT_VERSION = '1.0.0';

/**
 * Export a session to a file
 */
export async function exportSession(
  session: ChatSession,
  format: ExportFormat,
  outputPath?: string | undefined
): Promise<string> {
  let content: string;
  let defaultFilename: string;

  switch (format) {
    case 'json':
      content = formatAsJSON(session, true);
      defaultFilename = `chat-${session.id.substring(0, 8)}.json`;
      break;

    case 'markdown':
      content = formatAsMarkdown(session);
      defaultFilename = `chat-${session.id.substring(0, 8)}.md`;
      break;

    case 'txt':
      content = formatAsText(session);
      defaultFilename = `chat-${session.id.substring(0, 8)}.txt`;
      break;

    default:
      throw new Error(`Unsupported format: ${format as string}`);
  }

  const filePath = outputPath || path.join(process.cwd(), defaultFilename);

  await fs.writeFile(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Import a session from a file
 */
export async function importSession(
  filePath: string,
  format?: ExportFormat | undefined,
  sessionName?: string | undefined
): Promise<ChatSession> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Auto-detect format if not specified
  let detectedFormat: ExportFormat;
  if (format) {
    detectedFormat = format;
  } else {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
      detectedFormat = 'json';
    } else if (ext === '.md' || ext === '.markdown') {
      detectedFormat = 'markdown';
    } else {
      // Try to parse as JSON first
      try {
        JSON.parse(content);
        detectedFormat = 'json';
      } catch {
        detectedFormat = 'markdown';
      }
    }
  }

  let exported: ConversationExport;

  switch (detectedFormat) {
    case 'json':
      exported = parseJSONExport(content);
      break;

    case 'markdown':
      exported = parseMarkdownExport(content);
      break;

    default:
      throw new Error(`Cannot import from format: ${detectedFormat}`);
  }

  // Convert to ChatSession
  const now = new Date().toISOString();
  const session: ChatSession = {
    id: randomUUID(),
    name: sessionName || exported.session.name,
    model: exported.session.model,
    messages: exported.messages,
    createdAt: now,
    updatedAt: now,
  };

  return session;
}

/**
 * Format session as JSON
 */
export function formatAsJSON(session: ChatSession, pretty: boolean = false): string {
  const exported: ConversationExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    session: {
      id: session.id,
      name: session.name,
      model: session.model,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    messages: session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    metadata: {
      totalMessages: session.messages.length,
    },
  };

  return JSON.stringify(exported, null, pretty ? 2 : 0);
}

/**
 * Format session as Markdown
 */
export function formatAsMarkdown(session: ChatSession): string {
  const lines: string[] = [];

  // Header
  lines.push('# Conversation Export');
  lines.push('');
  lines.push(`**Session:** ${session.name || session.id}`);
  lines.push(`**Model:** ${session.model}`);
  lines.push(`**Created:** ${new Date(session.createdAt).toLocaleString()}`);
  lines.push(`**Messages:** ${session.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const message of session.messages) {
    if (message.role === 'system') {
      lines.push('## 🔧 System');
      lines.push(message.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    } else if (message.role === 'user') {
      lines.push('## 💬 You');
      lines.push(message.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    } else if (message.role === 'assistant') {
      lines.push('## 🤖 Assistant');
      lines.push(message.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // Footer
  lines.push(`*Exported from Ollama CLI on ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}

/**
 * Format session as plain text
 */
export function formatAsText(session: ChatSession): string {
  const lines: string[] = [];

  // Header
  lines.push('='.repeat(60));
  lines.push('CONVERSATION EXPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Session: ${session.name || session.id}`);
  lines.push(`Model: ${session.model}`);
  lines.push(`Created: ${new Date(session.createdAt).toLocaleString()}`);
  lines.push(`Messages: ${session.messages.length}`);
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('');

  // Messages
  for (const message of session.messages) {
    if (message.role === 'system') {
      lines.push('[SYSTEM]');
      lines.push(message.content);
    } else if (message.role === 'user') {
      lines.push('[YOU]');
      lines.push(message.content);
    } else if (message.role === 'assistant') {
      lines.push('[ASSISTANT]');
      lines.push(message.content);
    }

    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('');
  }

  // Footer
  lines.push(`Exported from Ollama CLI on ${new Date().toLocaleString()}`);

  return lines.join('\n');
}

/**
 * Parse JSON export
 */
export function parseJSONExport(content: string): ConversationExport {
  const data = JSON.parse(content) as ConversationExport;

  // Validate structure
  if (!data.version || !data.session || !data.messages) {
    throw new Error('Invalid export format: missing required fields');
  }

  return data;
}

/**
 * Parse Markdown export
 */
export function parseMarkdownExport(content: string): ConversationExport {
  const lines = content.split('\n');

  // Extract metadata
  let model = 'llama2'; // default
  let sessionName: string | undefined;
  let createdAt = new Date().toISOString();

  for (const line of lines.slice(0, 10)) {
    const modelMatch = /\*\*Model:\*\*\s+(.+)/.exec(line);
    if (modelMatch && modelMatch[1]) {
      model = modelMatch[1].trim();
    }

    const sessionMatch = /\*\*Session:\*\*\s+(.+)/.exec(line);
    if (sessionMatch && sessionMatch[1]) {
      sessionName = sessionMatch[1].trim();
    }

    const createdMatch = /\*\*Created:\*\*\s+(.+)/.exec(line);
    if (createdMatch && createdMatch[1]) {
      createdAt = new Date(createdMatch[1].trim()).toISOString();
    }
  }

  // Extract messages
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [];

  let currentRole: 'system' | 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];

  const pushMessage = (): void => {
    if (currentRole && currentContent.length > 0) {
      messages.push({
        role: currentRole,
        content: currentContent.join('\n').trim(),
      });
      currentContent = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('## 🔧 System')) {
      pushMessage();
      currentRole = 'system';
    } else if (line.startsWith('## 💬 You')) {
      pushMessage();
      currentRole = 'user';
    } else if (line.startsWith('## 🤖 Assistant')) {
      pushMessage();
      currentRole = 'assistant';
    } else if (line === '---') {
      // Separator, skip
      continue;
    } else if (line.startsWith('# ') || line.startsWith('**')) {
      // Header or metadata, skip
      continue;
    } else if (line.startsWith('*Exported from')) {
      // Footer, skip
      continue;
    } else if (currentRole && line.trim()) {
      currentContent.push(line);
    }
  }

  // Push last message
  pushMessage();

  const now = new Date().toISOString();

  return {
    version: EXPORT_VERSION,
    exportedAt: now,
    session: {
      id: randomUUID(),
      name: sessionName,
      model,
      createdAt,
      updatedAt: now,
    },
    messages,
    metadata: {
      totalMessages: messages.length,
    },
  };
}
