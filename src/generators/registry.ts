/**
 * Generator Registry - Available code generators
 */

import type { GeneratorTemplate, GeneratorType, Framework } from '../types/generators.js';
import { generateExpressAPI } from './templates/express-api.js';
import { generateExpressAuth } from './templates/express-auth.js';

/**
 * Registry of all available generators
 */
export const GENERATORS: GeneratorTemplate[] = [
  {
    type: 'api',
    framework: 'express',
    language: 'typescript',
    description: 'Express REST API with TypeScript',
    requiredOptions: ['name'],
    generate: generateExpressAPI,
  },
  {
    type: 'api',
    framework: 'express',
    language: 'javascript',
    description: 'Express REST API with JavaScript',
    requiredOptions: ['name'],
    generate: generateExpressAPI,
  },
  {
    type: 'auth',
    framework: 'express',
    language: 'typescript',
    description: 'JWT Authentication for Express (TypeScript)',
    requiredOptions: [],
    generate: generateExpressAuth,
  },
  {
    type: 'auth',
    framework: 'express',
    language: 'javascript',
    description: 'JWT Authentication for Express (JavaScript)',
    requiredOptions: [],
    generate: generateExpressAuth,
  },
];

/**
 * Find generator by type, framework, and language
 */
export function findGenerator(
  type: GeneratorType,
  framework: Framework,
  language: 'typescript' | 'javascript' | 'python' | 'php'
): GeneratorTemplate | null {
  return GENERATORS.find(
    (g) => g.type === type && g.framework === framework && g.language === language
  ) || null;
}

/**
 * Get all generators
 */
export function getAllGenerators(): GeneratorTemplate[] {
  return GENERATORS;
}

/**
 * Get generators by type
 */
export function getGeneratorsByType(type: GeneratorType): GeneratorTemplate[] {
  return GENERATORS.filter((g) => g.type === type);
}

/**
 * Get generators by framework
 */
export function getGeneratorsByFramework(framework: Framework): GeneratorTemplate[] {
  return GENERATORS.filter((g) => g.framework === framework);
}
