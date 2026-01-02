# Write Flow Guide

This document provides comprehensive guidance for the AI file-writer assistant when creating, modifying, or generating code files in the Ollama CLI project.

## Table of Contents

1. [Code Style & Standards](#code-style--standards)
2. [File Templates](#file-templates)
3. [Common Patterns](#common-patterns)
4. [Pre-Write Checklist](#pre-write-checklist)
5. [Post-Write Validation](#post-write-validation)
6. [Best Practices](#best-practices)

## Code Style & Standards

### TypeScript Configuration

**Critical Settings:**
- `exactOptionalPropertyTypes: true` - All optional properties must include `| undefined`
- `strict: true` - Strict null checks, no implicit any
- `noUnusedLocals: true` - No unused variables
- `noUnusedParameters: true` - No unused function parameters

**Correct Optional Properties:**
```typescript
// ❌ Wrong
interface Config {
  name?: string;
}

// ✅ Correct
interface Config {
  name?: string | undefined;
}
```

### ESM Import/Export

**All imports must end with `.js`** (even for `.ts` files):
```typescript
// ✅ Correct
import { readFile } from './utils.js';
import type { Config } from '../types/config.js';

// ❌ Wrong
import { readFile } from './utils';
import type { Config } from '../types/config';
```

### File Organization

**Standard file structure:**
```typescript
/**
 * Module description
 */

// 1. External imports
import fs from 'fs/promises';
import path from 'path';

// 2. Internal imports
import { helper } from './utils.js';
import type { MyType } from '../types/index.js';

// 3. Type definitions (if not in separate types/ file)
interface LocalType {
  // ...
}

// 4. Constants
const DEFAULT_VALUE = 'value';

// 5. Helper functions (private)
function privateHelper() {
  // ...
}

// 6. Main exported functions
export async function mainFunction() {
  // ...
}

// 7. Default export (if applicable)
export default {
  mainFunction,
};
```

### Naming Conventions

**Files:**
- `kebab-case.ts` for implementation files
- `PascalCase.ts` for component files (if applicable)
- `*.test.ts` for test files
- `index.ts` for barrel exports

**Functions:**
- `camelCase` for regular functions
- `PascalCase` for constructors/classes

**Types:**
- `PascalCase` for interfaces, types, classes
- Suffix with descriptive name: `UserConfig`, `SessionData`, `ToolResult`

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constants
- `camelCase` for local constants

## File Templates

### Command Handler Template

```typescript
/**
 * [Command Name] Command Handler
 */

import chalk from 'chalk';
import type { CommandOptions } from '../types/commands.js';

export type [Command]Command = 'action1' | 'action2' | 'action3';

export interface [Command]Options {
  flag1?: boolean | undefined;
  flag2?: string | undefined;
}

/**
 * Handle [command] command
 */
export async function [command]Command(
  command: [Command]Command,
  args: string[],
  options: [Command]Options = {}
): Promise<void> {
  switch (command) {
    case 'action1':
      await action1Cmd(args, options);
      break;
    case 'action2':
      await action2Cmd(args, options);
      break;
    case 'action3':
      await action3Cmd(args, options);
      break;
    default:
      console.log(chalk.red(`Unknown command: ${command as never}`));
      console.log(chalk.yellow('Usage: ollama-cli [command] <action>'));
      console.log(chalk.cyan('Available actions: action1, action2, action3'));
      process.exit(1);
  }
}

/**
 * Action 1 implementation
 */
async function action1Cmd(args: string[], options: [Command]Options): Promise<void> {
  try {
    // Implementation
    console.log(chalk.green('✓ Action 1 completed'));
  } catch (error) {
    console.error(chalk.red('✗ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Action 2 implementation
 */
async function action2Cmd(args: string[], options: [Command]Options): Promise<void> {
  // Implementation
}

/**
 * Action 3 implementation
 */
async function action3Cmd(args: string[], options: [Command]Options): Promise<void> {
  // Implementation
}
```

### Type Definition Template

```typescript
/**
 * [Module Name] Type Definitions
 */

/**
 * [Description of main type]
 */
export interface [MainType] {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  optional?: string | undefined;
}

/**
 * [Description of config type]
 */
export interface [Config] {
  required: string;
  optional?: number | undefined;
  withDefault?: boolean | undefined;
}

/**
 * [Description of result type]
 */
export interface [Result] {
  success: boolean;
  data?: unknown | undefined;
  error?: string | undefined;
}

/**
 * Union types for specific values
 */
export type [Action] = 'create' | 'update' | 'delete';
export type [Status] = 'pending' | 'in_progress' | 'completed' | 'failed';
```

### Test File Template

```typescript
/**
 * [Module Name] Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { functionToTest } from './module.js';
import type { ConfigType } from '../types/index.js';

describe('[Module Name]', () => {
  // Setup/teardown
  beforeEach(async () => {
    // Setup code
  });

  afterEach(async () => {
    // Cleanup code
  });

  describe('Feature Group 1', () => {
    it('should handle basic case', async () => {
      const input = { /* ... */ };
      const result = await functionToTest(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle edge case', async () => {
      const input = { /* ... */ };
      const result = await functionToTest(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expected error');
    });

    it('should validate input', async () => {
      await expect(
        functionToTest({} as any)
      ).rejects.toThrow('Validation error');
    });
  });

  describe('Feature Group 2', () => {
    it('should handle async operations', async () => {
      // Test implementation
    });

    it('should handle errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

### Utility Function Template

```typescript
/**
 * [Utility Name] - [Brief description]
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * [Function description]
 *
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = await utilityFunction('input', { option: true });
 * console.log(result);
 * ```
 */
export async function utilityFunction(
  param1: string,
  param2: { option: boolean }
): Promise<string> {
  // Validate inputs
  if (!param1) {
    throw new Error('param1 is required');
  }

  try {
    // Implementation
    const result = await someAsyncOperation(param1);
    return result;
  } catch (error) {
    throw new Error(
      `Failed to execute utility: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Helper function (not exported)
 */
function helperFunction(input: string): string {
  return input.trim();
}
```

## Common Patterns

### File Operations

**Reading files:**
```typescript
import fs from 'fs/promises';
import path from 'path';

// Read file
const content = await fs.readFile(filePath, 'utf-8');

// Check if file exists
try {
  await fs.access(filePath);
  // File exists
} catch {
  // File doesn't exist
}

// Read directory
const files = await fs.readdir(dirPath);
```

**Writing files:**
```typescript
// Ensure directory exists
await fs.mkdir(path.dirname(filePath), { recursive: true });

// Write file
await fs.writeFile(filePath, content, 'utf-8');

// Append to file
await fs.appendFile(filePath, content, 'utf-8');
```

### Error Handling

**Command-level errors:**
```typescript
try {
  const result = await operation();
  console.log(chalk.green('✓ Success:'), result);
} catch (error) {
  console.error(
    chalk.red('✗ Error:'),
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}
```

**Function-level errors:**
```typescript
export async function myFunction(input: string): Promise<Result> {
  if (!input) {
    throw new Error('Input is required');
  }

  try {
    const result = await riskyOperation(input);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Async/Await

**Always use async/await for promises:**
```typescript
// ✅ Correct
const result = await fs.readFile(filePath, 'utf-8');
const data = JSON.parse(result);

// ❌ Wrong
fs.readFile(filePath, 'utf-8').then(result => {
  const data = JSON.parse(result);
});
```

**Parallel operations:**
```typescript
// When operations are independent
const [result1, result2, result3] = await Promise.all([
  operation1(),
  operation2(),
  operation3(),
]);

// When operations depend on each other
const result1 = await operation1();
const result2 = await operation2(result1);
const result3 = await operation3(result2);
```

### Type Safety

**Avoid `any`, use `unknown`:**
```typescript
// ✅ Correct
function processData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }
  return String(data);
}

// ❌ Wrong
function processData(data: any): string {
  return data.toString();
}
```

**Type guards:**
```typescript
function isValidConfig(obj: unknown): obj is Config {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string'
  );
}

if (isValidConfig(data)) {
  // TypeScript knows data is Config here
  console.log(data.name);
}
```

### JSON Parsing

**Safe JSON parsing:**
```typescript
try {
  const data = JSON.parse(content) as MyType;
  // Validate data structure
  if (!isValidStructure(data)) {
    throw new Error('Invalid data structure');
  }
  return data;
} catch (error) {
  throw new Error(
    `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

### Storage Patterns

**Loading data:**
```typescript
async function loadData(): Promise<DataType> {
  try {
    const content = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(content) as DataType;
  } catch {
    // Return default if file doesn't exist
    return getDefaultData();
  }
}
```

**Saving data:**
```typescript
async function saveData(data: DataType): Promise<void> {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(
    dataPath,
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}
```

## Pre-Write Checklist

Before writing/modifying files:

1. **Read existing code** - Understand current patterns
2. **Check types** - Review relevant type definitions
3. **Verify imports** - Ensure all imports end with `.js`
4. **Plan structure** - Follow existing file organization
5. **Consider tests** - Plan test cases for new functionality

## Post-Write Validation

After writing/modifying files:

1. **Type check** - Ensure TypeScript compiles (`npm run build`)
2. **Lint** - Check for ESLint errors (`npm run lint`)
3. **Test** - Run relevant tests (`npm test`)
4. **Format** - Ensure consistent formatting (`npm run format`)
5. **Review** - Check for:
   - Unused imports
   - Missing error handling
   - Inconsistent naming
   - Missing JSDoc comments

## Best Practices

### Documentation

**Module-level comments:**
```typescript
/**
 * Session Analytics Tracker
 *
 * Tracks usage events for sessions, messages, tools, and commands.
 * Stores analytics data in ~/.ollama-cli/analytics.json.
 */
```

**Function-level comments:**
```typescript
/**
 * Generate usage statistics for all sessions
 *
 * @param filter - Optional filter for date range, session ID, or model
 * @returns Comprehensive usage statistics including sessions, messages, tools
 *
 * @example
 * ```typescript
 * const stats = await generateUsageStats({
 *   dateRange: { start: '2024-01-01', end: '2024-12-31' }
 * });
 * ```
 */
export async function generateUsageStats(
  filter?: AnalyticsFilter | undefined
): Promise<UsageStats> {
  // Implementation
}
```

### Avoid Over-Engineering

**Keep it simple:**
```typescript
// ✅ Simple and clear
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ❌ Over-engineered
function capitalize(str: string, options?: { locale?: string; preserveCase?: boolean }): string {
  const locale = options?.locale ?? 'en-US';
  const preserve = options?.preserveCase ?? false;
  // ... complex logic
}
```

### Performance Considerations

**Efficient file operations:**
```typescript
// ✅ Read once
const content = await fs.readFile(filePath, 'utf-8');
const lines = content.split('\n');
processLines(lines);

// ❌ Multiple reads
for (let i = 0; i < 100; i++) {
  const content = await fs.readFile(filePath, 'utf-8');
}
```

**Memoization when appropriate:**
```typescript
let cachedData: DataType | null = null;

async function getData(): Promise<DataType> {
  if (cachedData) {
    return cachedData;
  }

  cachedData = await loadData();
  return cachedData;
}
```

### Security

**Path validation:**
```typescript
import path from 'path';

function validatePath(filePath: string, workingDir: string): string {
  const resolved = path.resolve(workingDir, filePath);

  if (!resolved.startsWith(workingDir)) {
    throw new Error('Path traversal attempt detected');
  }

  return resolved;
}
```

**Sanitize user input:**
```typescript
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .slice(0, 1000);      // Limit length
}
```

## Code Generation Guidelines

When generating code (via the `generate` command):

1. **Follow existing patterns** - Match the project's style
2. **Include TODOs** - Mark areas needing customization
3. **Add comments** - Explain generated code
4. **Provide instructions** - Include setup/usage guide
5. **Generate tests** - Include test files when appropriate

**Example generated file header:**
```typescript
/**
 * Generated by ollama-cli generate command
 *
 * TODO: Replace mock data with actual database integration
 * TODO: Add custom validation rules
 * TODO: Implement error handling for specific use case
 */
```

## Integration Points

### Adding to Existing Systems

When integrating new code with existing systems:

1. **Tool System** - Register in `src/tools/registry.ts`
2. **CLI Commands** - Add to `src/cli.ts`
3. **Types** - Define in `src/types/`
4. **Analytics** - Add tracking calls
5. **Tests** - Add comprehensive test coverage

### Dependencies

**Adding new dependencies:**
```bash
# Production dependency
npm install package-name

# Dev dependency
npm install -D package-name

# Optional dependency (for database clients)
npm install --save-optional pg mysql2
```

**Import conventions:**
```typescript
// External packages
import chalk from 'chalk';
import ora from 'ora';

// Node.js built-ins
import fs from 'fs/promises';
import path from 'path';

// Internal modules
import { helper } from '../utils/helper.js';
```

---

**Remember:** The goal is to write clean, maintainable, and well-tested code that follows the project's established patterns and conventions.
