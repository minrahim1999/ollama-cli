/**
 * Assistant type definitions
 * Custom AI assistants with different personas and capabilities
 */

export interface Assistant {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  toolsEnabled: boolean;
  defaultModel?: string | undefined;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantConfig {
  defaultAssistantId: string;
  assistants: Assistant[];
}
