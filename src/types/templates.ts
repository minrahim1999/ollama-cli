/**
 * Template system types
 */

export type TemplateCategory = 'code' | 'documentation' | 'git' | 'general';

export interface Template {
  id: string; // UUID
  name: string; // "Code Review Template"
  category: TemplateCategory;
  description: string;
  content: string; // Template text with {{variables}}
  variables: string[]; // ["filename", "language"]
  systemPrompt?: string | undefined; // Optional custom system prompt
  model?: string | undefined; // Optional preferred model
  builtIn: boolean; // Read-only if true
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface TemplateConfig {
  templates: Template[];
}

export interface CreateTemplateParams {
  name: string;
  category: TemplateCategory;
  description: string;
  content: string;
  systemPrompt?: string | undefined;
  model?: string | undefined;
}

export interface UpdateTemplateParams {
  name?: string | undefined;
  category?: TemplateCategory | undefined;
  description?: string | undefined;
  content?: string | undefined;
  systemPrompt?: string | undefined;
  model?: string | undefined;
}
