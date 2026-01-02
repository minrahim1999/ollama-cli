/**
 * Analytics Tracker - Event tracking and storage
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import type {
  AnalyticsEvent,
  EventType,
  EventData,
  AnalyticsStore,
  AnalyticsFilter,
} from '../types/analytics.js';

/**
 * Get analytics store file path
 */
function getAnalyticsPath(): string {
  return path.join(homedir(), '.ollama-cli', 'analytics.json');
}

/**
 * Load analytics store
 */
async function loadStore(): Promise<AnalyticsStore> {
  try {
    const analyticsPath = getAnalyticsPath();
    const content = await fs.readFile(analyticsPath, 'utf-8');
    return JSON.parse(content) as AnalyticsStore;
  } catch {
    return {
      events: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Save analytics store
 */
async function saveStore(store: AnalyticsStore): Promise<void> {
  const analyticsDir = path.dirname(getAnalyticsPath());
  await fs.mkdir(analyticsDir, { recursive: true });

  const analyticsPath = getAnalyticsPath();
  await fs.writeFile(
    analyticsPath,
    JSON.stringify({ ...store, lastUpdated: new Date().toISOString() }, null, 2),
    'utf-8'
  );
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  type: EventType,
  sessionId: string,
  data: EventData = {}
): Promise<void> {
  const store = await loadStore();

  const event: AnalyticsEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    sessionId,
    data,
  };

  store.events.push(event);

  // Keep only last 10,000 events to prevent unbounded growth
  if (store.events.length > 10000) {
    store.events = store.events.slice(-10000);
  }

  await saveStore(store);
}

/**
 * Get all events
 */
export async function getEvents(filter?: AnalyticsFilter): Promise<AnalyticsEvent[]> {
  const store = await loadStore();
  let events = store.events;

  if (!filter) {
    return events;
  }

  // Apply filters
  if (filter.sessionId) {
    events = events.filter((e) => e.sessionId === filter.sessionId);
  }

  if (filter.eventTypes && filter.eventTypes.length > 0) {
    events = events.filter((e) => filter.eventTypes!.includes(e.type));
  }

  if (filter.model) {
    events = events.filter((e) => e.data.model === filter.model);
  }

  if (filter.dateRange) {
    const start = new Date(filter.dateRange.start).getTime();
    const end = new Date(filter.dateRange.end).getTime();
    events = events.filter((e) => {
      const timestamp = new Date(e.timestamp).getTime();
      return timestamp >= start && timestamp <= end;
    });
  }

  return events;
}

/**
 * Clear analytics data
 */
export async function clearAnalytics(): Promise<void> {
  const store: AnalyticsStore = {
    events: [],
    lastUpdated: new Date().toISOString(),
  };
  await saveStore(store);
}

/**
 * Get analytics store info
 */
export async function getStoreInfo(): Promise<{
  totalEvents: number;
  oldestEvent?: string;
  newestEvent?: string;
  storageSize: number;
}> {
  const store = await loadStore();
  const analyticsPath = getAnalyticsPath();

  let storageSize = 0;
  try {
    const stats = await fs.stat(analyticsPath);
    storageSize = stats.size;
  } catch {
    // File doesn't exist
  }

  const events = store.events;
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const result: {
    totalEvents: number;
    oldestEvent?: string | undefined;
    newestEvent?: string | undefined;
    storageSize: number;
  } = {
    totalEvents: events.length,
    storageSize,
  };

  if (sorted[0]) {
    result.oldestEvent = sorted[0].timestamp;
  }

  const newest = sorted[sorted.length - 1];
  if (newest) {
    result.newestEvent = newest.timestamp;
  }

  // @ts-expect-error - TypeScript's exactOptionalPropertyTypes is overly strict here
  return result;
}

/**
 * Convenience functions for common events
 */

export async function trackSessionStart(
  sessionId: string,
  model: string,
  assistant?: string,
  agent?: string
): Promise<void> {
  await trackEvent('session:start', sessionId, { model, assistant, agent });
}

export async function trackSessionEnd(sessionId: string): Promise<void> {
  await trackEvent('session:end', sessionId, {});
}

export async function trackMessageSent(
  sessionId: string,
  messageLength: number,
  tokensEstimate?: number
): Promise<void> {
  await trackEvent('message:sent', sessionId, { messageLength, tokensEstimate });
}

export async function trackMessageReceived(
  sessionId: string,
  messageLength: number,
  tokensEstimate?: number
): Promise<void> {
  await trackEvent('message:received', sessionId, { messageLength, tokensEstimate });
}

export async function trackToolExecution(
  sessionId: string,
  toolName: string,
  duration: number,
  success: boolean
): Promise<void> {
  await trackEvent(success ? 'tool:executed' : 'tool:error', sessionId, {
    toolName,
    toolDuration: duration,
    toolSuccess: success,
  });
}

export async function trackCommand(sessionId: string, command: string): Promise<void> {
  await trackEvent('command:executed', sessionId, { command });
}

export async function trackError(
  sessionId: string,
  errorType: string,
  errorMessage: string
): Promise<void> {
  await trackEvent('error:occurred', sessionId, { errorType, errorMessage });
}
