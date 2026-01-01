/**
 * Prompt library types
 */

export interface PromptVariable {
  name: string;
  description?: string;
  default?: string;
  required: boolean;
}

export interface PromptSnippet {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: PromptVariable[];
  category?: string | undefined;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface PromptLibrary {
  version: string;
  prompts: PromptSnippet[];
}

export interface PromptUsageOptions {
  variables?: Record<string, string>;
}
