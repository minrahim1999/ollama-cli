/**
 * Code Generators Types - Templates for generating common code patterns
 */

export type GeneratorType = 'api' | 'crud' | 'auth' | 'model' | 'test' | 'component';

export type Framework =
  | 'express'
  | 'fastify'
  | 'next'
  | 'react'
  | 'vue'
  | 'django'
  | 'flask'
  | 'laravel'
  | 'generic';

export type Language = 'typescript' | 'javascript' | 'python' | 'php';

export interface GeneratorConfig {
  type: GeneratorType;
  framework: Framework;
  language: Language;
  name: string; // Resource name (e.g., "User", "Product")
  outputPath?: string | undefined; // Where to generate files
  options?: GeneratorOptions | undefined;
}

export interface GeneratorOptions {
  // API Generator options
  methods?: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> | undefined;
  auth?: boolean | undefined;
  validation?: boolean | undefined;

  // CRUD Generator options
  fields?: Field[] | undefined;
  timestamps?: boolean | undefined;
  softDelete?: boolean | undefined;

  // Auth Generator options
  authType?: 'jwt' | 'session' | 'oauth' | undefined;
  providers?: string[] | undefined; // OAuth providers

  // Model Generator options
  tableName?: string | undefined;
  relationships?: Relationship[] | undefined;

  // Test Generator options
  testFramework?: 'jest' | 'vitest' | 'pytest' | 'phpunit' | undefined;
  coverage?: boolean | undefined;

  // Component Generator options
  props?: ComponentProp[] | undefined;
  hooks?: boolean | undefined; // Use hooks (React)
  styling?: 'css' | 'scss' | 'tailwind' | 'styled-components' | undefined;

  // Additional metadata
  [key: string]: unknown;
}

export interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean | undefined;
  default?: unknown;
  validation?: ValidationRule[] | undefined;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: unknown;
  message?: string | undefined;
}

export interface Relationship {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
  model: string;
  foreignKey?: string | undefined;
  through?: string | undefined; // For many-to-many
}

export interface ComponentProp {
  name: string;
  type: string;
  required?: boolean | undefined;
  default?: unknown;
}

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export interface GeneratorResult {
  success: boolean;
  files: GeneratedFile[];
  instructions?: string | undefined; // Post-generation instructions
  error?: string | undefined;
}

export interface GeneratorTemplate {
  type: GeneratorType;
  framework: Framework;
  language: Language;
  description: string;
  requiredOptions: string[];
  generate: (config: GeneratorConfig) => Promise<GeneratorResult>;
}
