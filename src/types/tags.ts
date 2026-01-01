/**
 * Tag system type definitions
 */

export interface SessionTag {
  sessionId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TagIndex {
  tags: Record<string, string[]>; // tag -> sessionIds
  sessions: Record<string, string[]>; // sessionId -> tags
}
