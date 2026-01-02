/**
 * Analytics Types - Session tracking and usage insights
 */

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  type: EventType;
  sessionId: string;
  data: EventData;
}

export type EventType =
  | 'session:start'
  | 'session:end'
  | 'message:sent'
  | 'message:received'
  | 'tool:executed'
  | 'tool:error'
  | 'command:executed'
  | 'error:occurred';

export interface EventData {
  // Session events
  model?: string | undefined;
  assistant?: string | undefined;
  agent?: string | undefined;

  // Message events
  messageLength?: number | undefined;
  tokensEstimate?: number | undefined;

  // Tool events
  toolName?: string | undefined;
  toolDuration?: number | undefined;
  toolSuccess?: boolean | undefined;

  // Command events
  command?: string | undefined;

  // Error events
  errorType?: string | undefined;
  errorMessage?: string | undefined;

  // Additional metadata
  [key: string]: unknown;
}

export interface AnalyticsStore {
  events: AnalyticsEvent[];
  lastUpdated: string;
}

export interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  totalTools: number;
  totalTokens: number;
  totalDuration: number;
  averageSessionLength: number;
  averageMessageLength: number;
  toolSuccessRate: number;
  mostUsedTools: ToolUsage[];
  mostUsedModels: ModelUsage[];
  mostUsedCommands: CommandUsage[];
  errorRate: number;
  sessionsByDay: Record<string, number>;
  peakUsageHours: number[];
}

export interface ToolUsage {
  name: string;
  count: number;
  successCount: number;
  errorCount: number;
  averageDuration: number;
  totalDuration: number;
}

export interface ModelUsage {
  name: string;
  count: number;
  totalTokens: number;
  averageTokens: number;
}

export interface CommandUsage {
  name: string;
  count: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AnalyticsFilter {
  dateRange?: DateRange | undefined;
  sessionId?: string | undefined;
  eventTypes?: EventType[] | undefined;
  model?: string | undefined;
}
