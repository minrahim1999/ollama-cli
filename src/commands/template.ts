/**
 * Template command - Manage prompt templates
 */

import readline from 'readline';
import chalk from 'chalk';
import type { TemplateCategory, CreateTemplateParams } from '../types/templates.js';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
} from '../templates/index.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';

export type TemplateCommand = 'list' | 'show' | 'create' | 'use' | 'edit' | 'delete';

interface TemplateOptions {
  category?: TemplateCategory | undefined;
}

/**
 * Main template command handler
 */
export async function templateCommand(
  command: TemplateCommand,
  args: string[],
  options: TemplateOptions
): Promise<void> {
  switch (command) {
    case 'list':
      await listTemplatesCmd(options.category);
      break;

    case 'show':
      if (args.length === 0) {
        displayError('Usage: ollama-cli template show <name-or-id>');
        return;
      }
      await showTemplateCmd(args[0]!);
      break;

    case 'create':
      await createTemplateCmd();
      break;

    case 'use':
      if (args.length === 0) {
        displayError('Usage: ollama-cli template use <name> [key=value...]');
        return;
      }
      await useTemplateCmd(args[0]!, parseVariables(args.slice(1)));
      break;

    case 'edit':
      if (args.length === 0) {
        displayError('Usage: ollama-cli template edit <name-or-id>');
        return;
      }
      await editTemplateCmd(args[0]!);
      break;

    case 'delete':
      if (args.length === 0) {
        displayError('Usage: ollama-cli template delete <name-or-id>');
        return;
      }
      await deleteTemplateCmd(args[0]!);
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: list, show, create, use, edit, delete');
  }
}

/**
 * List templates
 */
async function listTemplatesCmd(category?: TemplateCategory): Promise<void> {
  try {
    const templates = await listTemplates(category);

    if (templates.length === 0) {
      displayInfo(category ? `No templates in category: ${category}` : 'No templates found');
      return;
    }

    console.log('');
    console.log(gradients.brand('Templates'));
    console.log('');

    // Group by category
    const grouped = new Map<string, typeof templates>();
    for (const template of templates) {
      const cat = template.category;
      if (!grouped.has(cat)) {
        grouped.set(cat, []);
      }
      grouped.get(cat)!.push(template);
    }

    // Display by category
    for (const [cat, temps] of grouped) {
      const categoryIcon =
        cat === 'code' ? '⚡' : cat === 'documentation' ? '📝' : cat === 'git' ? '🔀' : '💬';

      console.log(colors.secondary(`${categoryIcon} ${cat.toUpperCase()}`));
      console.log('');

      for (const template of temps) {
        const builtInTag = template.builtIn ? colors.tertiary(' [built-in]') : '';
        console.log(`  ${colors.brand.primary(template.name)}${builtInTag}`);
        console.log(`  ${colors.tertiary(template.description)}`);

        if (template.variables.length > 0) {
          console.log(
            `  ${colors.dim(`Variables: ${template.variables.join(', ')}`)}`
          );
        }

        console.log('');
      }
    }

    console.log(colors.tertiary(`Total: ${templates.length} templates`));
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to list templates'
    );
  }
}

/**
 * Show template details
 */
async function showTemplateCmd(nameOrId: string): Promise<void> {
  try {
    const template = await getTemplate(nameOrId);

    if (!template) {
      displayError(`Template not found: ${nameOrId}`);
      return;
    }

    console.log('');
    console.log(gradients.brand(template.name));
    console.log('');

    console.log(colors.secondary('Description:'));
    console.log(`  ${template.description}`);
    console.log('');

    console.log(colors.secondary('Category:'));
    console.log(`  ${template.category}`);
    console.log('');

    if (template.variables.length > 0) {
      console.log(colors.secondary('Variables:'));
      for (const variable of template.variables) {
        console.log(`  ${colors.brand.accent('{{' + variable + '}}')}`);;
      }
      console.log('');
    }

    console.log(colors.secondary('Content:'));
    const lines = template.content.split('\n');
    for (const line of lines) {
      console.log(`  ${colors.tertiary(line)}`);
    }
    console.log('');

    if (template.systemPrompt) {
      console.log(colors.secondary('System Prompt:'));
      console.log(`  ${colors.tertiary(template.systemPrompt)}`);
      console.log('');
    }

    if (template.model) {
      console.log(colors.secondary('Preferred Model:'));
      console.log(`  ${template.model}`);
      console.log('');
    }

    console.log(colors.dim(`ID: ${template.id}`));
    if (template.builtIn) {
      console.log(colors.dim('Type: Built-in'));
    }
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to show template'
    );
  }
}

/**
 * Create a new template (interactive)
 */
async function createTemplateCmd(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  try {
    console.log('');
    console.log(gradients.brand('Create New Template'));
    console.log('');

    const name = await question(colors.brand.primary('Template name: '));
    if (!name) {
      displayError('Template name is required');
      rl.close();
      return;
    }

    const description = await question(colors.brand.primary('Description: '));
    if (!description) {
      displayError('Description is required');
      rl.close();
      return;
    }

    const categoryInput = await question(
      colors.brand.primary('Category (code/documentation/git/general): ')
    );
    const category = (categoryInput || 'general') as TemplateCategory;

    if (!['code', 'documentation', 'git', 'general'].includes(category)) {
      displayError('Invalid category. Use: code, documentation, git, or general');
      rl.close();
      return;
    }

    console.log('');
    console.log(colors.secondary('Enter template content (use {{variable}} for placeholders):'));
    console.log(colors.tertiary('Type :done on a new line when finished'));
    console.log('');

    const contentLines: string[] = [];
    let line = '';

    const lineQuestion = (): Promise<void> => {
      return new Promise((resolve) => {
        rl.question(colors.dim('  '), (input) => {
          line = input;
          resolve();
        });
      });
    };

    while (line !== ':done') {
      await lineQuestion();
      if (line !== ':done') {
        contentLines.push(line);
      }
    }

    const content = contentLines.join('\n');

    if (!content.trim()) {
      displayError('Template content is required');
      rl.close();
      return;
    }

    const systemPrompt = await question(
      colors.brand.primary('System prompt (optional, press Enter to skip): ')
    );

    const model = await question(
      colors.brand.primary('Preferred model (optional, press Enter to skip): ')
    );

    rl.close();

    const params: CreateTemplateParams = {
      name,
      description,
      category,
      content,
      systemPrompt: systemPrompt || undefined,
      model: model || undefined,
    };

    const template = await createTemplate(params);

    console.log('');
    displaySuccess(`Template created: ${template.name}`);
    console.log(colors.tertiary(`ID: ${template.id}`));
    console.log(colors.tertiary(`Variables: ${template.variables.join(', ') || 'none'}`));
    console.log('');
  } catch (error) {
    rl.close();
    displayError(
      error instanceof Error ? error.message : 'Failed to create template'
    );
  }
}

/**
 * Use a template
 */
async function useTemplateCmd(
  nameOrId: string,
  variables: Record<string, string>
): Promise<void> {
  try {
    const template = await getTemplate(nameOrId);

    if (!template) {
      displayError(`Template not found: ${nameOrId}`);
      return;
    }

    // Check if all required variables are provided
    const missingVars = template.variables.filter((v) => !(v in variables));

    if (missingVars.length > 0) {
      displayError(`Missing variables: ${missingVars.join(', ')}`);
      console.log('');
      console.log(colors.secondary('Usage:'));
      console.log(
        `  ollama-cli template use ${nameOrId} ${template.variables.map((v) => `${v}=value`).join(' ')}`
      );
      console.log('');
      return;
    }

    const rendered = renderTemplate(template, variables);

    console.log('');
    console.log(gradients.brand('Rendered Template'));
    console.log('');
    console.log(colors.tertiary(rendered));
    console.log('');

    console.log(colors.dim('Tip: Copy this output to use in a chat session'));
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to use template'
    );
  }
}

/**
 * Edit a template
 */
async function editTemplateCmd(nameOrId: string): Promise<void> {
  try {
    const template = await getTemplate(nameOrId);

    if (!template) {
      displayError(`Template not found: ${nameOrId}`);
      return;
    }

    if (template.builtIn) {
      displayError('Cannot edit built-in templates');
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
      });
    };

    console.log('');
    console.log(gradients.brand(`Edit Template: ${template.name}`));
    console.log(colors.tertiary('Press Enter to keep current value'));
    console.log('');

    const name = await question(
      colors.brand.primary(`Name [${template.name}]: `)
    );

    const description = await question(
      colors.brand.primary(`Description [${template.description}]: `)
    );

    rl.close();

    const updated = await updateTemplate(template.id, {
      name: name || undefined,
      description: description || undefined,
    });

    if (updated) {
      displaySuccess(`Template updated: ${updated.name}`);
    }
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to edit template'
    );
  }
}

/**
 * Delete a template
 */
async function deleteTemplateCmd(nameOrId: string): Promise<void> {
  try {
    const template = await getTemplate(nameOrId);

    if (!template) {
      displayError(`Template not found: ${nameOrId}`);
      return;
    }

    if (template.builtIn) {
      displayError('Cannot delete built-in templates');
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const confirmed = await new Promise<boolean>((resolve) => {
      rl.question(
        chalk.yellow(`\nDelete template "${template.name}"? (yes/no): `),
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        }
      );
    });

    if (!confirmed) {
      displayInfo('Cancelled');
      return;
    }

    const deleted = await deleteTemplate(template.id);

    if (deleted) {
      displaySuccess(`Template deleted: ${template.name}`);
    } else {
      displayError('Failed to delete template');
    }
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to delete template'
    );
  }
}

/**
 * Parse key=value arguments
 */
export function parseVariables(args: string[]): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const arg of args) {
    const match = /^(\w+)=(.+)$/.exec(arg);
    if (match && match[1] && match[2]) {
      variables[match[1]] = match[2];
    }
  }

  return variables;
}
