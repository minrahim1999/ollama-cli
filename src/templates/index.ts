/**
 * Template management system
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  Template,
  TemplateConfig,
  TemplateCategory,
  CreateTemplateParams,
  UpdateTemplateParams,
} from '../types/templates.js';

const TEMPLATES_DIR = path.join(process.env['HOME'] || '~', '.ollama-cli');
const TEMPLATES_FILE = path.join(TEMPLATES_DIR, 'templates.json');

/**
 * Get built-in templates
 */
export function getBuiltInTemplates(): Template[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'builtin-code-review',
      name: 'Code Review',
      category: 'code' as TemplateCategory,
      description: 'Review code for bugs, quality, and best practices',
      content: `Please review this {{language}} code in {{filename}}:

{{code}}

Check for:
- Potential bugs and edge cases
- Code quality and readability
- Best practices and patterns
- Security concerns
- Performance issues`,
      variables: ['filename', 'language', 'code'],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'builtin-documentation',
      name: 'Documentation Generator',
      category: 'documentation' as TemplateCategory,
      description: 'Generate documentation for code components',
      content: `Generate comprehensive documentation for this {{type}}:

{{component}}

Include:
- Purpose and overview
- Parameters/props (if applicable)
- Return value/usage
- Examples
- Any important notes or edge cases`,
      variables: ['component', 'type'],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'builtin-bug-fix',
      name: 'Bug Fix Assistant',
      category: 'code' as TemplateCategory,
      description: 'Help diagnose and fix bugs',
      content: `Help me fix this bug:

**Issue:** {{issue}}
**Expected:** {{expected}}
**Actual:** {{actual}}

{{code}}

Please:
1. Identify the root cause
2. Suggest a fix
3. Explain why this happens`,
      variables: ['issue', 'expected', 'actual', 'code'],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'builtin-refactor',
      name: 'Code Refactoring',
      category: 'code' as TemplateCategory,
      description: 'Refactor code to improve quality',
      content: `Refactor this code to {{goal}}:

{{code}}

Requirements:
- Maintain the same functionality
- Improve code quality
- Follow best practices
- Add comments where helpful`,
      variables: ['code', 'goal'],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'builtin-test-generation',
      name: 'Test Generator',
      category: 'code' as TemplateCategory,
      description: 'Generate unit tests for functions',
      content: `Generate {{framework}} tests for this function:

{{function}}

Include:
- Happy path tests
- Edge cases
- Error handling
- Clear test descriptions`,
      variables: ['function', 'framework'],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Load templates configuration
 */
export async function loadTemplatesConfig(): Promise<TemplateConfig> {
  try {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });

    try {
      const content = await fs.readFile(TEMPLATES_FILE, 'utf-8');
      const config = JSON.parse(content) as TemplateConfig;

      // Ensure built-in templates are always available
      const builtIns = getBuiltInTemplates();
      const builtInIds = new Set(builtIns.map((t) => t.id));

      // Remove any user templates that conflict with built-in IDs
      config.templates = config.templates.filter((t) => !builtInIds.has(t.id));

      // Add built-ins at the beginning
      config.templates = [...builtIns, ...config.templates];

      return config;
    } catch {
      // File doesn't exist, return built-in templates
      return {
        templates: getBuiltInTemplates(),
      };
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
    return {
      templates: getBuiltInTemplates(),
    };
  }
}

/**
 * Save templates configuration
 */
export async function saveTemplatesConfig(config: TemplateConfig): Promise<void> {
  try {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });

    // Filter out built-in templates before saving
    const userTemplates = config.templates.filter((t) => !t.builtIn);

    const configToSave: TemplateConfig = {
      templates: userTemplates,
    };

    // Atomic write
    const tempFile = `${TEMPLATES_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(configToSave, null, 2), 'utf-8');
    await fs.rename(tempFile, TEMPLATES_FILE);
  } catch (error) {
    throw new Error(
      `Failed to save templates: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract variables from template content
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: Template,
  variables: Record<string, string>
): string {
  let rendered = template.content;

  // Replace all {{variable}} occurrences
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value);
  }

  return rendered;
}

/**
 * Create a new template
 */
export async function createTemplate(params: CreateTemplateParams): Promise<Template> {
  const config = await loadTemplatesConfig();

  // Check for duplicate names
  const existingName = config.templates.find(
    (t) => t.name.toLowerCase() === params.name.toLowerCase()
  );
  if (existingName) {
    throw new Error(`Template with name "${params.name}" already exists`);
  }

  const now = new Date().toISOString();
  const template: Template = {
    id: randomUUID(),
    name: params.name,
    category: params.category,
    description: params.description,
    content: params.content,
    variables: extractVariables(params.content),
    systemPrompt: params.systemPrompt,
    model: params.model,
    builtIn: false,
    createdAt: now,
    updatedAt: now,
  };

  config.templates.push(template);
  await saveTemplatesConfig(config);

  return template;
}

/**
 * Get a template by ID or name
 */
export async function getTemplate(nameOrId: string): Promise<Template | null> {
  const config = await loadTemplatesConfig();

  // Try ID first
  let template = config.templates.find((t) => t.id === nameOrId);

  // Try name (case-insensitive)
  if (!template) {
    template = config.templates.find(
      (t) => t.name.toLowerCase() === nameOrId.toLowerCase()
    );
  }

  return template || null;
}

/**
 * List all templates, optionally filtered by category
 */
export async function listTemplates(category?: TemplateCategory): Promise<Template[]> {
  const config = await loadTemplatesConfig();

  if (category) {
    return config.templates.filter((t) => t.category === category);
  }

  return config.templates;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  updates: UpdateTemplateParams
): Promise<Template | null> {
  const config = await loadTemplatesConfig();

  const index = config.templates.findIndex((t) => t.id === id);
  if (index === -1) {
    return null;
  }

  const template = config.templates[index];
  if (!template) {
    return null;
  }

  // Can't update built-in templates
  if (template.builtIn) {
    throw new Error('Cannot modify built-in templates');
  }

  // Update fields (filter out undefined values)
  const updated: Template = {
    ...template,
    updatedAt: new Date().toISOString(),
  };

  // Apply updates only if they're not undefined
  if (updates.name !== undefined) {
    updated.name = updates.name;
  }
  if (updates.category !== undefined) {
    updated.category = updates.category;
  }
  if (updates.description !== undefined) {
    updated.description = updates.description;
  }
  if (updates.content !== undefined) {
    updated.content = updates.content;
    // Re-extract variables if content changed
    updated.variables = extractVariables(updates.content);
  }
  if (updates.systemPrompt !== undefined) {
    updated.systemPrompt = updates.systemPrompt;
  }
  if (updates.model !== undefined) {
    updated.model = updates.model;
  }

  config.templates[index] = updated;
  await saveTemplatesConfig(config);

  return updated;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const config = await loadTemplatesConfig();

  const index = config.templates.findIndex((t) => t.id === id);
  if (index === -1) {
    return false;
  }

  const template = config.templates[index];
  if (!template) {
    return false;
  }

  // Can't delete built-in templates
  if (template.builtIn) {
    throw new Error('Cannot delete built-in templates');
  }

  config.templates.splice(index, 1);
  await saveTemplatesConfig(config);

  return true;
}
