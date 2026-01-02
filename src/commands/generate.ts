/**
 * Generate Command - Code generation from templates
 */

import fs from 'fs/promises';
import path from 'path';
import type { GeneratorConfig, GeneratorType, Framework, Language } from '../types/generators.js';
import { findGenerator, getAllGenerators } from '../generators/registry.js';
import { colors } from '../ui/colors.js';
import { displayError, displaySuccess } from '../ui/display.js';
import { select } from '../utils/prompt.js';

export type GenerateCommand = 'list' | 'api' | 'auth' | 'crud' | 'model' | 'test' | 'component';

/**
 * Execute generate command
 */
export async function generateCommand(
  command: GenerateCommand,
  args: string[],
  options: { framework?: string; language?: string; output?: string }
): Promise<void> {
  switch (command) {
    case 'list':
      await listGenerators();
      break;

    case 'api':
    case 'auth':
    case 'crud':
    case 'model':
    case 'test':
    case 'component':
      await runGenerator(command, args, options);
      break;

    default:
      displayError(`Unknown command: ${command}`);
      console.log('');
      console.log('Available commands: list, api, auth, crud, model, test, component');
  }
}

/**
 * List available generators
 */
async function listGenerators(): Promise<void> {
  const generators = getAllGenerators();

  console.log('');
  console.log(colors.primary('📦 Available Code Generators'));
  console.log('');

  const byType: Record<string, typeof generators> = {};
  for (const gen of generators) {
    if (!byType[gen.type]) {
      byType[gen.type] = [];
    }
    byType[gen.type]!.push(gen);
  }

  for (const [type, gens] of Object.entries(byType)) {
    console.log(colors.secondary(type.toUpperCase()));
    console.log('');

    for (const gen of gens) {
      console.log(`  ${colors.brand.primary(`${gen.framework}/${gen.language}`)}`);
      console.log(`  ${colors.tertiary(gen.description)}`);
      console.log('');
    }
  }

  console.log(colors.secondary('Usage:'));
  console.log(`  ollama-cli generate <type> <name> --framework <framework> --language <language>`);
  console.log('');
  console.log(colors.tertiary('Example:'));
  console.log(`  ollama-cli generate api User --framework express --language typescript`);
  console.log('');
}

/**
 * Run a generator
 */
async function runGenerator(
  type: GeneratorType,
  args: string[],
  options: { framework?: string; language?: string; output?: string }
): Promise<void> {
  // Get resource name
  let resourceName = args[0];
  if (!resourceName && type !== 'auth') {
    // Simple readline input
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    resourceName = await new Promise<string>((resolve) => {
      rl.question('Resource name (e.g., User, Product): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!resourceName) {
      displayError('Resource name is required');
      return;
    }
  }

  // Get framework
  let framework = options.framework as Framework;
  if (!framework) {
    const frameworks = ['express', 'fastify', 'next', 'react', 'django', 'flask', 'laravel'];
    framework = (await select('Select framework:', frameworks)) as Framework;
  }

  // Get language
  let language = options.language as Language;
  if (!language) {
    const languages = framework === 'express' || framework === 'fastify' || framework === 'next'
      ? ['typescript', 'javascript']
      : framework === 'django' || framework === 'flask'
      ? ['python']
      : framework === 'laravel'
      ? ['php']
      : ['typescript'];
    language = (await select('Select language:', languages)) as Language;
  }

  // Find generator
  const generator = findGenerator(type, framework, language);
  if (!generator) {
    displayError(`No generator found for ${type} with ${framework}/${language}`);
    return;
  }

  console.log('');
  console.log(colors.primary(`🚀 Generating ${type} for ${resourceName || framework}...`));
  console.log('');

  // Build config
  const config: GeneratorConfig = {
    type,
    framework,
    language,
    name: resourceName || 'auth',
    outputPath: options.output,
    options: {},
  };

  // Get type-specific options
  if (type === 'api') {
    const methodsInput = await select(
      'Select HTTP methods (space to toggle, enter to confirm):',
      ['GET', 'POST', 'PUT', 'DELETE']
    );
    config.options = {
      methods: [methodsInput] as Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>,
      auth: (await select('Require authentication?', ['Yes', 'No'])) === 'Yes',
      validation: (await select('Add validation?', ['Yes', 'No'])) === 'Yes',
    };
  }

  if (type === 'auth') {
    config.options = {
      authType: 'jwt',
    };
  }

  // Run generator
  try {
    const result = await generator.generate(config);

    if (!result.success) {
      displayError(result.error || 'Generation failed');
      return;
    }

    // Write files
    console.log(colors.secondary('Generated Files:'));
    console.log('');

    for (const file of result.files) {
      const outputPath = options.output
        ? path.join(options.output, file.path)
        : file.path;

      // Create directory if it doesn't exist
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(outputPath, file.content, 'utf-8');

      console.log(`  ${colors.success('✓')} ${colors.brand.primary(outputPath)}`);
      console.log(`     ${colors.tertiary(file.description)}`);
      console.log('');
    }

    // Show instructions
    if (result.instructions) {
      console.log(colors.secondary('Next Steps:'));
      console.log(colors.tertiary(result.instructions));
    }

    displaySuccess(`Successfully generated ${result.files.length} file(s)`);
    console.log('');
  } catch (error) {
    displayError(
      `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
