/**
 * Session management tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  createSession,
  saveSession,
  loadSession,
  listSessions,
  addMessage,
  clearMessages,
} from './index.js';

const TEST_SESSIONS_DIR = path.join(homedir(), '.ollama-cli-test', 'sessions');

// Mock the config module to use test directory
vi.mock('../config/index.js', async () => {
  const actual = await vi.importActual<typeof import('../config/index.js')>('../config/index.js');
  return {
    ...actual,
    getSessionsDir: () => TEST_SESSIONS_DIR,
    ensureSessionsDir: async () => {
      await fs.mkdir(TEST_SESSIONS_DIR, { recursive: true });
    },
  };
});

describe('Session Management', () => {
  beforeEach(async () => {
    // Clean up only the sessions directory, not the parent
    try {
      await fs.rm(TEST_SESSIONS_DIR, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
    // Recreate sessions directory with parent
    await fs.mkdir(TEST_SESSIONS_DIR, { recursive: true });
    // Small delay to ensure filesystem is ready
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(path.dirname(TEST_SESSIONS_DIR), { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  });

  it('should create a new session', async () => {
    const session = await createSession('llama2', 'test-session');
    expect(session.model).toBe('llama2');
    expect(session.name).toBe('test-session');
    expect(session.messages).toEqual([]);
    expect(session.id).toBeTruthy();
  });

  it('should save and load session', async () => {
    const session = await createSession('llama2');
    const sessionId = session.id;

    const loaded = await loadSession(sessionId);
    expect(loaded).toBeTruthy();
    expect(loaded?.id).toBe(sessionId);
    expect(loaded?.model).toBe('llama2');
  });

  it('should add messages to session', async () => {
    let session = await createSession('llama2');

    session = await addMessage(session, {
      role: 'user',
      content: 'Hello',
    });

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0]?.content).toBe('Hello');
  });

  it('should clear messages', async () => {
    let session = await createSession('llama2');

    session = await addMessage(session, {
      role: 'user',
      content: 'Hello',
    });

    session = await clearMessages(session);
    expect(session.messages).toEqual([]);
  });

  it('should list sessions', async () => {
    await createSession('llama2', 'session-1');
    await createSession('mistral', 'session-2');

    const sessions = await listSessions();
    expect(sessions).toHaveLength(2);
  });

  it('should return null for non-existent session', async () => {
    const loaded = await loadSession('non-existent-id');
    expect(loaded).toBeNull();
  });
});
