/**
 * Type Definition Snippet
 *
 * Use this template when creating new type definitions.
 * Replace {{MODULE}} with your module name (e.g., 'Analytics', 'Cache')
 */

/**
 * Main {{MODULE}} interface
 */
export interface {{MODULE}}Config {
  enabled: boolean;
  name: string;
  options?: {{MODULE}}Options | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * {{MODULE}} options
 */
export interface {{MODULE}}Options {
  timeout?: number | undefined;
  retries?: number | undefined;
  verbose?: boolean | undefined;
}

/**
 * {{MODULE}} result
 */
export interface {{MODULE}}Result {
  success: boolean;
  data?: unknown | undefined;
  error?: string | undefined;
  metadata?: {{MODULE}}Metadata | undefined;
}

/**
 * {{MODULE}} metadata
 */
export interface {{MODULE}}Metadata {
  timestamp: string;
  duration?: number | undefined;
  [key: string]: unknown;
}

/**
 * {{MODULE}} status types
 */
export type {{MODULE}}Status = 'idle' | 'running' | 'completed' | 'failed';

/**
 * {{MODULE}} action types
 */
export type {{MODULE}}Action = 'create' | 'read' | 'update' | 'delete';

/**
 * {{MODULE}} filter
 */
export interface {{MODULE}}Filter {
  status?: {{MODULE}}Status | undefined;
  dateRange?: {
    start: string;
    end: string;
  } | undefined;
  limit?: number | undefined;
}

/**
 * {{MODULE}} event
 */
export interface {{MODULE}}Event {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}
