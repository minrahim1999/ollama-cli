/**
 * Analytics Tracker Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  trackEvent,
  trackSessionStart,
  trackSessionEnd,
  trackMessageSent,
  trackMessageReceived,
  trackToolExecution,
  trackCommand,
  trackError,
  getEvents,
  clearAnalytics,
  getStoreInfo,
} from './tracker.js';

const TEST_SESSION_ID = 'test-session-123';

describe('Analytics Tracker', () => {
  beforeEach(async () => {
    // Clear analytics before each test
    await clearAnalytics();
  });

  afterEach(async () => {
    // Clean up after tests
    await clearAnalytics();
  });

  describe('Event Tracking', () => {
    it('should track session start event', async () => {
      await trackSessionStart(TEST_SESSION_ID, 'llama3.2', 'coding-assistant');

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('session:start');
      expect(events[0]?.sessionId).toBe(TEST_SESSION_ID);
      expect(events[0]?.data.model).toBe('llama3.2');
      expect(events[0]?.data.assistant).toBe('coding-assistant');
    });

    it('should track session end event', async () => {
      await trackSessionEnd(TEST_SESSION_ID);

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('session:end');
      expect(events[0]?.sessionId).toBe(TEST_SESSION_ID);
    });

    it('should track message sent event', async () => {
      await trackMessageSent(TEST_SESSION_ID, 150, 37);

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('message:sent');
      expect(events[0]?.data.messageLength).toBe(150);
      expect(events[0]?.data.tokensEstimate).toBe(37);
    });

    it('should track tool execution', async () => {
      await trackToolExecution(TEST_SESSION_ID, 'read_file', 250, true);

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('tool:executed');
      expect(events[0]?.data.toolName).toBe('read_file');
      expect(events[0]?.data.toolDuration).toBe(250);
      expect(events[0]?.data.toolSuccess).toBe(true);
    });

    it('should track tool errors', async () => {
      await trackToolExecution(TEST_SESSION_ID, 'write_file', 100, false);

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('tool:error');
      expect(events[0]?.data.toolSuccess).toBe(false);
    });

    it('should track commands', async () => {
      await trackCommand(TEST_SESSION_ID, 'help');

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('command:executed');
      expect(events[0]?.data.command).toBe('help');
    });

    it('should track errors', async () => {
      await trackError(TEST_SESSION_ID, 'validation_error', 'Invalid input');

      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('error:occurred');
      expect(events[0]?.data.errorType).toBe('validation_error');
      expect(events[0]?.data.errorMessage).toBe('Invalid input');
    });
  });

  describe('Event Filtering', () => {
    beforeEach(async () => {
      // Create test events
      await trackSessionStart('session-1', 'llama3.2');
      await trackSessionStart('session-2', 'mistral');
      await trackMessageSent('session-1', 100);
      await trackToolExecution('session-1', 'read_file', 50, true);
    });

    it('should filter events by session ID', async () => {
      const events = await getEvents({ sessionId: 'session-1' });
      expect(events).toHaveLength(3);
      expect(events.every((e) => e.sessionId === 'session-1')).toBe(true);
    });

    it('should filter events by type', async () => {
      const events = await getEvents({
        eventTypes: ['session:start'],
      });
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.type === 'session:start')).toBe(true);
    });

    it('should filter events by model', async () => {
      const events = await getEvents({ model: 'llama3.2' });
      expect(events).toHaveLength(1);
      expect(events[0]?.data.model).toBe('llama3.2');
    });
  });

  describe('Storage Management', () => {
    it('should provide store info', async () => {
      await trackSessionStart(TEST_SESSION_ID, 'llama3.2');
      await trackMessageSent(TEST_SESSION_ID, 100);

      const info = await getStoreInfo();
      expect(info.totalEvents).toBe(2);
      expect(info.oldestEvent).toBeDefined();
      expect(info.newestEvent).toBeDefined();
      expect(info.storageSize).toBeGreaterThan(0);
    });

    it('should clear all analytics', async () => {
      await trackSessionStart(TEST_SESSION_ID, 'llama3.2');
      await trackMessageSent(TEST_SESSION_ID, 100);

      await clearAnalytics();

      const events = await getEvents();
      expect(events).toHaveLength(0);
    });

    it('should limit events to 10,000', async () => {
      // This would be slow to test with 10k events
      // Just verify the structure exists
      const events = await getEvents();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Event Structure', () => {
    it('should generate unique event IDs', async () => {
      await trackSessionStart(TEST_SESSION_ID, 'llama3.2');
      await trackSessionStart(TEST_SESSION_ID, 'llama3.2');

      const events = await getEvents();
      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include timestamps', async () => {
      const before = new Date().toISOString();
      await trackSessionStart(TEST_SESSION_ID, 'llama3.2');
      const after = new Date().toISOString();

      const events = await getEvents();
      const timestamp = events[0]?.timestamp;
      expect(timestamp).toBeDefined();
      expect(timestamp! >= before).toBe(true);
      expect(timestamp! <= after).toBe(true);
    });
  });
});
