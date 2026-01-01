/**
 * Prompt library management
 * Save and reuse common prompts with variable substitution
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { PromptSnippet, PromptLibrary, PromptUsageOptions } from '../types/prompts.js';
import { getConfigDir } from '../config/index.js';

const PROMPTS_FILE = path.join(getConfigDir(), 'prompts.json');

/**
 * Load prompt library from disk
 */
export async function loadPromptLibrary(): Promise<PromptLibrary> {
  try {
    const content = await fs.readFile(PROMPTS_FILE, 'utf-8');
    return JSON.parse(content) as PromptLibrary;
  } catch (error) {
    // Return empty library if file doesn't exist
    return {
      version: '1.0.0',
      prompts: [],
    };
  }
}

/**
 * Save prompt library to disk
 */
export async function savePromptLibrary(library: PromptLibrary): Promise<void> {
  await fs.writeFile(PROMPTS_FILE, JSON.stringify(library, null, 2), 'utf-8');
}

/**
 * Extract variables from prompt content
 * Variables are in the format {{variableName}}
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const varName = match[1];
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }

  return variables;
}

/**
 * Render prompt with variable substitution
 */
export function renderPrompt(
  prompt: PromptSnippet,
  options: PromptUsageOptions = {}
): string {
  let rendered = prompt.content;
  const variables = options.variables || {};

  // Substitute variables
  for (const variable of prompt.variables) {
    const value = variables[variable.name] || variable.default || '';
    const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value);
  }

  return rendered;
}

/**
 * Create a new prompt snippet
 */
export async function createPrompt(
  name: string,
  content: string,
  description: string = '',
  category?: string,
  tags: string[] = []
): Promise<PromptSnippet> {
  const library = await loadPromptLibrary();

  // Check if prompt with same name exists
  const existing = library.prompts.find((p) => p.name === name);
  if (existing) {
    throw new Error(`Prompt with name "${name}" already exists`);
  }

  // Extract variables from content
  const variableNames = extractVariables(content);
  const variables = variableNames.map((name) => ({
    name,
    required: true,
  }));

  const prompt: PromptSnippet = {
    id: randomUUID(),
    name,
    description,
    content,
    variables,
    category,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
  };

  library.prompts.push(prompt);
  await savePromptLibrary(library);

  return prompt;
}

/**
 * Get a prompt by name or ID
 */
export async function getPrompt(nameOrId: string): Promise<PromptSnippet | null> {
  const library = await loadPromptLibrary();
  return (
    library.prompts.find(
      (p) => p.name === nameOrId || p.id === nameOrId
    ) || null
  );
}

/**
 * List all prompts
 */
export async function listPrompts(category?: string): Promise<PromptSnippet[]> {
  const library = await loadPromptLibrary();

  if (category) {
    return library.prompts.filter((p) => p.category === category);
  }

  return library.prompts;
}

/**
 * Update a prompt
 */
export async function updatePrompt(
  nameOrId: string,
  updates: Partial<Omit<PromptSnippet, 'id' | 'createdAt' | 'usageCount'>>
): Promise<PromptSnippet> {
  const library = await loadPromptLibrary();
  const index = library.prompts.findIndex(
    (p) => p.name === nameOrId || p.id === nameOrId
  );

  if (index === -1) {
    throw new Error(`Prompt not found: ${nameOrId}`);
  }

  const prompt = library.prompts[index]!;

  // Update content and re-extract variables if content changed
  if (updates.content && updates.content !== prompt.content) {
    const variableNames = extractVariables(updates.content);
    updates.variables = variableNames.map((name) => ({
      name,
      required: true,
    }));
  }

  library.prompts[index] = {
    ...prompt,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await savePromptLibrary(library);
  return library.prompts[index]!;
}

/**
 * Delete a prompt
 */
export async function deletePrompt(nameOrId: string): Promise<boolean> {
  const library = await loadPromptLibrary();
  const initialLength = library.prompts.length;

  library.prompts = library.prompts.filter(
    (p) => p.name !== nameOrId && p.id !== nameOrId
  );

  if (library.prompts.length === initialLength) {
    return false; // Not found
  }

  await savePromptLibrary(library);
  return true;
}

/**
 * Increment usage count for a prompt
 */
export async function incrementPromptUsage(nameOrId: string): Promise<void> {
  const library = await loadPromptLibrary();
  const prompt = library.prompts.find(
    (p) => p.name === nameOrId || p.id === nameOrId
  );

  if (prompt) {
    prompt.usageCount++;
    await savePromptLibrary(library);
  }
}

/**
 * Search prompts by name, description, or tags
 */
export async function searchPrompts(query: string): Promise<PromptSnippet[]> {
  const library = await loadPromptLibrary();
  const lowerQuery = query.toLowerCase();

  return library.prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Export prompts to JSON file
 */
export async function exportPrompts(
  filePath: string,
  promptNames?: string[]
): Promise<void> {
  const library = await loadPromptLibrary();

  const prompts = promptNames
    ? library.prompts.filter((p) => promptNames.includes(p.name))
    : library.prompts;

  const exportData = {
    version: library.version,
    exportedAt: new Date().toISOString(),
    prompts,
  };

  await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
}

/**
 * Import prompts from JSON file
 */
export async function importPrompts(
  filePath: string,
  overwrite: boolean = false
): Promise<number> {
  const content = await fs.readFile(filePath, 'utf-8');
  const importData = JSON.parse(content) as { prompts: PromptSnippet[] };

  const library = await loadPromptLibrary();
  let imported = 0;

  for (const prompt of importData.prompts) {
    const existing = library.prompts.find((p) => p.name === prompt.name);

    if (existing && !overwrite) {
      continue; // Skip existing prompts
    }

    if (existing && overwrite) {
      // Update existing
      const index = library.prompts.indexOf(existing);
      library.prompts[index] = {
        ...prompt,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Add new
      library.prompts.push({
        ...prompt,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    imported++;
  }

  await savePromptLibrary(library);
  return imported;
}
