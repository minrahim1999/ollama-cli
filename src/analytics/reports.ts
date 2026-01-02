/**
 * Analytics Reports - Generate insights from tracked events
 */

import type {
  UsageStats,
  ToolUsage,
  ModelUsage,
  CommandUsage,
  AnalyticsFilter,
} from '../types/analytics.js';
import { getEvents } from './tracker.js';

/**
 * Get date string (YYYY-MM-DD)
 */
function getDateString(timestamp: string): string {
  return new Date(timestamp).toISOString().split('T')[0]!;
}

/**
 * Get hour from timestamp (0-23)
 */
function getHour(timestamp: string): number {
  return new Date(timestamp).getHours();
}

/**
 * Generate usage statistics
 */
export async function generateUsageStats(filter?: AnalyticsFilter): Promise<UsageStats> {
  const events = await getEvents(filter);

  // Count sessions
  const sessionIds = new Set(events.map((e) => e.sessionId));
  const totalSessions = sessionIds.size;

  // Count messages
  const messageEvents = events.filter((e) =>
    ['message:sent', 'message:received'].includes(e.type)
  );
  const totalMessages = messageEvents.length;

  // Calculate total tokens
  let totalTokens = 0;
  let totalMessageLength = 0;
  for (const event of messageEvents) {
    const tokens = event.data.tokensEstimate || 0;
    const length = event.data.messageLength || 0;
    totalTokens += typeof tokens === 'number' ? tokens : 0;
    totalMessageLength += typeof length === 'number' ? length : 0;
  }

  // Tool usage
  const toolEvents = events.filter((e) => ['tool:executed', 'tool:error'].includes(e.type));
  const totalTools = toolEvents.length;

  const toolMap = new Map<string, ToolUsage>();
  for (const event of toolEvents) {
    const name = String(event.data.toolName || 'unknown');
    const duration = typeof event.data.toolDuration === 'number' ? event.data.toolDuration : 0;
    const success = event.type === 'tool:executed';

    if (!toolMap.has(name)) {
      toolMap.set(name, {
        name,
        count: 0,
        successCount: 0,
        errorCount: 0,
        averageDuration: 0,
        totalDuration: 0,
      });
    }

    const tool = toolMap.get(name)!;
    tool.count++;
    if (success) {
      tool.successCount++;
    } else {
      tool.errorCount++;
    }
    tool.totalDuration += duration;
  }

  // Calculate average durations
  for (const tool of toolMap.values()) {
    tool.averageDuration = tool.count > 0 ? tool.totalDuration / tool.count : 0;
  }

  const mostUsedTools = Array.from(toolMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Model usage
  const modelMap = new Map<string, ModelUsage>();
  const sessionStarts = events.filter((e) => e.type === 'session:start');
  for (const event of sessionStarts) {
    const model = String(event.data.model || 'unknown');
    if (!modelMap.has(model)) {
      modelMap.set(model, {
        name: model,
        count: 0,
        totalTokens: 0,
        averageTokens: 0,
      });
    }
    const modelData = modelMap.get(model)!;
    modelData.count++;
  }

  // Estimate tokens per model (approximate from messages)
  for (const event of messageEvents) {
    const sessionModel = sessionStarts.find((s) => s.sessionId === event.sessionId);
    if (sessionModel) {
      const model = String(sessionModel.data.model || 'unknown');
      const modelData = modelMap.get(model);
      if (modelData) {
        const tokens = typeof event.data.tokensEstimate === 'number' ? event.data.tokensEstimate : 0;
        modelData.totalTokens += tokens;
      }
    }
  }

  // Calculate average tokens
  for (const model of modelMap.values()) {
    model.averageTokens = model.count > 0 ? model.totalTokens / model.count : 0;
  }

  const mostUsedModels = Array.from(modelMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Command usage
  const commandEvents = events.filter((e) => e.type === 'command:executed');
  const commandMap = new Map<string, number>();
  for (const event of commandEvents) {
    const command = String(event.data.command || 'unknown');
    commandMap.set(command, (commandMap.get(command) || 0) + 1);
  }

  const mostUsedCommands: CommandUsage[] = Array.from(commandMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate session duration (approximate from start/end events)
  let totalDuration = 0;
  const sessionDurations = new Map<string, number>();
  for (const sessionId of sessionIds) {
    const sessionEvents = events.filter((e) => e.sessionId === sessionId);
    const starts = sessionEvents.filter((e) => e.type === 'session:start');
    const ends = sessionEvents.filter((e) => e.type === 'session:end');

    if (starts.length > 0 && ends.length > 0) {
      const start = new Date(starts[0]!.timestamp).getTime();
      const end = new Date(ends[ends.length - 1]!.timestamp).getTime();
      const duration = end - start;
      sessionDurations.set(sessionId, duration);
      totalDuration += duration;
    }
  }

  const averageSessionLength =
    sessionDurations.size > 0 ? totalDuration / sessionDurations.size : 0;

  // Sessions by day
  const sessionsByDay: Record<string, number> = {};
  for (const event of sessionStarts) {
    const date = getDateString(event.timestamp);
    sessionsByDay[date] = (sessionsByDay[date] || 0) + 1;
  }

  // Peak usage hours
  const hourCounts = new Array(24).fill(0);
  for (const event of events) {
    const hour = getHour(event.timestamp);
    hourCounts[hour]++;
  }

  const peakUsageHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.hour);

  // Error rate
  const errorEvents = events.filter((e) => e.type === 'error:occurred' || e.type === 'tool:error');
  const errorRate = events.length > 0 ? errorEvents.length / events.length : 0;

  // Tool success rate
  const successfulTools = toolEvents.filter((e) => e.type === 'tool:executed').length;
  const toolSuccessRate = totalTools > 0 ? successfulTools / totalTools : 1.0;

  const averageMessageLength = totalMessages > 0 ? totalMessageLength / totalMessages : 0;

  return {
    totalSessions,
    totalMessages,
    totalTools,
    totalTokens,
    totalDuration,
    averageSessionLength,
    averageMessageLength,
    toolSuccessRate,
    mostUsedTools,
    mostUsedModels,
    mostUsedCommands,
    errorRate,
    sessionsByDay,
    peakUsageHours,
  };
}

/**
 * Generate tool-specific report
 */
export async function generateToolReport(
  toolName: string,
  filter?: AnalyticsFilter
): Promise<{
  name: string;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  averageDuration: number;
  recentErrors: Array<{ timestamp: string; error: string }>;
}> {
  const events = await getEvents(filter);
  const toolEvents = events.filter(
    (e) =>
      ['tool:executed', 'tool:error'].includes(e.type) && e.data.toolName === toolName
  );

  const totalExecutions = toolEvents.length;
  const successCount = toolEvents.filter((e) => e.type === 'tool:executed').length;
  const errorCount = toolEvents.filter((e) => e.type === 'tool:error').length;
  const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0;

  let totalDuration = 0;
  for (const event of toolEvents) {
    const duration = typeof event.data.toolDuration === 'number' ? event.data.toolDuration : 0;
    totalDuration += duration;
  }
  const averageDuration = totalExecutions > 0 ? totalDuration / totalExecutions : 0;

  // Get recent errors
  const recentErrors = toolEvents
    .filter((e) => e.type === 'tool:error')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map((e) => ({
      timestamp: e.timestamp,
      error: String(e.data.errorMessage || 'Unknown error'),
    }));

  return {
    name: toolName,
    totalExecutions,
    successCount,
    errorCount,
    successRate,
    averageDuration,
    recentErrors,
  };
}

/**
 * Generate session report
 */
export async function generateSessionReport(sessionId: string): Promise<{
  sessionId: string;
  model?: string;
  assistant?: string;
  agent?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  messageCount: number;
  toolCount: number;
  totalTokens: number;
  toolsUsed: string[];
}> {
  const events = await getEvents({ sessionId });

  const startEvent = events.find((e) => e.type === 'session:start');
  const endEvent = events.find((e) => e.type === 'session:end');

  const messageEvents = events.filter((e) =>
    ['message:sent', 'message:received'].includes(e.type)
  );
  const toolEvents = events.filter((e) => ['tool:executed', 'tool:error'].includes(e.type));

  let totalTokens = 0;
  for (const event of messageEvents) {
    const tokens = typeof event.data.tokensEstimate === 'number' ? event.data.tokensEstimate : 0;
    totalTokens += tokens;
  }

  const toolsUsed = Array.from(
    new Set(toolEvents.map((e) => String(e.data.toolName || 'unknown')))
  );

  let duration: number | undefined;
  if (startEvent && endEvent) {
    const start = new Date(startEvent.timestamp).getTime();
    const end = new Date(endEvent.timestamp).getTime();
    duration = end - start;
  }

  const result: {
    sessionId: string;
    model?: string | undefined;
    assistant?: string | undefined;
    agent?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    duration?: number | undefined;
    messageCount: number;
    toolCount: number;
    totalTokens: number;
    toolsUsed: string[];
  } = {
    sessionId,
    messageCount: messageEvents.length,
    toolCount: toolEvents.length,
    totalTokens,
    toolsUsed,
  };

  if (startEvent) {
    if (startEvent.data.model) {
      result.model = String(startEvent.data.model);
    }
    if (startEvent.data.assistant) {
      result.assistant = String(startEvent.data.assistant);
    }
    if (startEvent.data.agent) {
      result.agent = String(startEvent.data.agent);
    }
    result.startTime = startEvent.timestamp;
  }

  if (endEvent) {
    result.endTime = endEvent.timestamp;
  }

  if (duration !== undefined) {
    result.duration = duration;
  }

  // @ts-expect-error - TypeScript's exactOptionalPropertyTypes is overly strict here
  return result;
}
