/**
 * Session management for chat conversations
 * Handles persistence, retrieval, and listing of chat sessions
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { ChatSession, Message } from '../types/index.js';
import { getSessionsDir, ensureSessionsDir } from '../config/index.js';

/**
 * Create a new chat session
 */
export async function createSession(model: string, name?: string): Promise<ChatSession> {
  await ensureSessionsDir();

  const session: ChatSession = {
    id: randomUUID(),
    name,
    model,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveSession(session);
  return session;
}

/**
 * Save a chat session to disk
 */
export async function saveSession(session: ChatSession): Promise<void> {
  await ensureSessionsDir();

  session.updatedAt = new Date().toISOString();
  const sessionPath = path.join(getSessionsDir(), `${session.id}.json`);

  // Atomic write using temp file + rename
  const tempPath = `${sessionPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(session, null, 2), 'utf-8');
  await fs.rename(tempPath, sessionPath);
}

/**
 * Load a chat session from disk
 */
export async function loadSession(sessionId: string): Promise<ChatSession | null> {
  const sessionPath = path.join(getSessionsDir(), `${sessionId}.json`);

  try {
    const data = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(data) as ChatSession;
  } catch (error) {
    return null;
  }
}

/**
 * List all available sessions
 */
export async function listSessions(): Promise<ChatSession[]> {
  await ensureSessionsDir();
  const sessionsDir = getSessionsDir();

  try {
    const files = await fs.readdir(sessionsDir);
    const sessions: ChatSession[] = [];

    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('.tmp')) {
        const sessionPath = path.join(sessionsDir, file);
        try {
          const data = await fs.readFile(sessionPath, 'utf-8');
          const session = JSON.parse(data) as ChatSession;
          sessions.push(session);
        } catch {
          // Skip invalid session files
        }
      }
    }

    // Sort by updated date (most recent first)
    sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return sessions;
  } catch {
    return [];
  }
}

/**
 * Delete a chat session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const sessionPath = path.join(getSessionsDir(), `${sessionId}.json`);

  try {
    await fs.unlink(sessionPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Add a message to a session
 */
export async function addMessage(
  session: ChatSession,
  message: Message
): Promise<ChatSession> {
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  await saveSession(session);
  return session;
}

/**
 * Clear messages in a session
 */
export async function clearMessages(session: ChatSession): Promise<ChatSession> {
  session.messages = [];
  session.updatedAt = new Date().toISOString();
  await saveSession(session);
  return session;
}

/**
 * Find session by name
 */
export async function findSessionByName(name: string): Promise<ChatSession | null> {
  const sessions = await listSessions();
  return sessions.find((s) => s.name === name) ?? null;
}
