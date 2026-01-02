# Integration Testing Guide

This guide explains how to integrate new features into the Ollama CLI project, ensuring proper connectivity with existing systems.

## Table of Contents

1. [Adding a New Tool](#adding-a-new-tool)
2. [Adding a New CLI Command](#adding-a-new-cli-command)
3. [Adding Analytics Tracking](#adding-analytics-tracking)
4. [Adding Caching Support](#adding-caching-support)
5. [Adding Database Integration](#adding-database-integration)
6. [Adding Code Generators](#adding-code-generators)
7. [Testing Integration](#testing-integration)

## Adding a New Tool

Tools are the core of the MCP (Model Context Protocol) system. Follow these steps to add a new tool:

### Step 1: Define Tool Type

Add your tool name to `src/types/tools.ts`:

```typescript
export type ToolName =
  | 'read_file'
  | 'write_file'
  // ... existing tools
  | 'my_new_tool'; // Add your tool here
```

### Step 2: Define Tool Parameters

In the same file, define the parameter types:

```typescript
export interface MyNewToolParams {
  param1: string;
  param2?: number | undefined;
  options?: {
    verbose?: boolean | undefined;
  } | undefined;
}
```

### Step 3: Add Tool Definition

In `src/tools/registry.ts`, add your tool definition:

```typescript
my_new_tool: {
  name: 'my_new_tool',
  description: 'Brief description of what this tool does',
  parameters: [
    {
      name: 'param1',
      type: 'string',
      description: 'Description of param1',
      required: true,
    },
    {
      name: 'param2',
      type: 'number',
      description: 'Description of param2',
      required: false,
    },
  ],
  dangerous: false, // Set to true if tool modifies system
  needsSnapshot: false, // Set to true if tool modifies files
}
```

### Step 4: Implement Tool Logic

In `src/tools/implementations.ts` (or create a new file for complex tools):

```typescript
/**
 * My new tool implementation
 */
export async function myNewTool(params: MyNewToolParams): Promise<string> {
  // Validate inputs
  if (!params.param1) {
    throw new Error('param1 is required');
  }

  try {
    // Tool logic here
    const result = await performOperation(params);

    // Return result as string or JSON
    return JSON.stringify({ success: true, result });
  } catch (error) {
    throw new Error(
      `Failed to execute my_new_tool: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

### Step 5: Register in Executor

In `src/tools/executor.ts`, add a case in the `execute` method:

```typescript
case 'my_new_tool':
  return await myNewTool(params as MyNewToolParams);
```

### Step 6: Add Tests

Create `src/tools/my-new-tool.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { myNewTool } from './implementations.js';

describe('myNewTool', () => {
  it('should execute successfully', async () => {
    const result = await myNewTool({ param1: 'test' });
    expect(result).toBeDefined();
  });

  it('should validate required params', async () => {
    await expect(
      myNewTool({} as any)
    ).rejects.toThrow('param1 is required');
  });
});
```

## Adding a New CLI Command

### Step 1: Create Command Handler

Create `src/commands/my-command.ts` (use snippet from `.ollama/snippets/command-handler.ts`):

```typescript
export type MyCommand = 'action1' | 'action2' | 'list';

export async function myCommand(
  command: MyCommand,
  args: string[],
  options: MyCommandOptions = {}
): Promise<void> {
  // Implementation
}
```

### Step 2: Add to CLI Router

In `src/cli.ts`, add your command:

```typescript
program
  .command('my-command <action> [args...]')
  .description('Description of my command')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <path>', 'Output file path')
  .action(async (action, args, options) => {
    await myCommand(action, args, options);
  });
```

### Step 3: Add Type Definitions

If needed, create `src/types/my-command.ts`:

```typescript
export interface MyCommandOptions {
  verbose?: boolean | undefined;
  output?: string | undefined;
}
```

### Step 4: Add Tests

Create `src/commands/my-command.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { myCommand } from './my-command.js';

describe('My Command', () => {
  it('should execute action1', async () => {
    await expect(
      myCommand('action1', [], {})
    ).resolves.not.toThrow();
  });
});
```

## Adding Analytics Tracking

To track usage of new features:

### Step 1: Identify Tracking Points

Determine what events to track:
- Command execution
- Tool usage
- Errors
- Custom events

### Step 2: Add Tracking Calls

In your command or tool implementation:

```typescript
import {
  trackCommand,
  trackToolExecution,
  trackError,
} from '../analytics/tracker.js';

export async function myCommand(
  command: string,
  args: string[],
  options: any
): Promise<void> {
  const sessionId = getCurrentSessionId(); // Get current session

  try {
    // Track command execution
    await trackCommand(sessionId, `my-command:${command}`);

    // Execute logic
    const startTime = Date.now();
    const result = await performOperation();
    const duration = Date.now() - startTime;

    // Track tool usage if applicable
    await trackToolExecution(sessionId, 'my_tool', duration, true);

  } catch (error) {
    // Track error
    await trackError(
      sessionId,
      'my_command_error',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
```

### Step 3: Define Custom Events (Optional)

If you need custom event types, add to `src/types/analytics.ts`:

```typescript
export type EventType =
  | 'session:start'
  | 'session:end'
  // ... existing types
  | 'my_custom:event'; // Add custom event
```

## Adding Caching Support

To add caching to expensive operations:

### Step 1: Import Cache Functions

```typescript
import {
  generateCacheKey,
  getCache,
  setCache,
} from '../cache/index.js';
import type { CacheMetadata } from '../types/cache.js';
```

### Step 2: Generate Cache Key

```typescript
const metadata: CacheMetadata = {
  type: 'my_operation',
  identifier: `${param1}-${param2}`,
  version: '1.0.0',
};

const cacheKey = generateCacheKey(metadata);
```

### Step 3: Check Cache Before Operation

```typescript
export async function expensiveOperation(
  param1: string,
  param2: number
): Promise<string> {
  // Try to get from cache
  const metadata: CacheMetadata = {
    type: 'expensive_op',
    identifier: `${param1}-${param2}`,
    version: '1.0.0',
  };

  const cached = await getCache(metadata);
  if (cached) {
    return cached;
  }

  // Perform expensive operation
  const result = await performExpensiveWork(param1, param2);

  // Store in cache (default TTL: 7 days)
  await setCache(metadata, result, {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return result;
}
```

### Step 4: Cache Invalidation

```typescript
import { invalidateCache } from '../cache/index.js';

export async function updateData(id: string, data: unknown): Promise<void> {
  // Update data
  await saveData(id, data);

  // Invalidate related cache
  await invalidateCache({
    type: 'data_fetch',
    identifier: id,
    version: '1.0.0',
  });
}
```

## Adding Database Integration

### Step 1: Choose Database Client

For SQLite:
```typescript
import { createSQLiteClient } from '../database/sqlite.js';
```

For PostgreSQL:
```typescript
import { createPostgresClient } from '../database/postgres.js';
```

For MySQL:
```typescript
import { createMySQLClient } from '../database/mysql.js';
```

### Step 2: Create Connection

```typescript
export async function initDatabase(): Promise<void> {
  const client = await createPostgresClient({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ollama_cli',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  // Use client
  const result = await client.query('SELECT * FROM users');

  // Close when done
  await client.close();
}
```

### Step 3: Query Execution

```typescript
export async function getUsers(): Promise<User[]> {
  const client = await getDbClient(); // Get existing client

  const result = await client.query(
    'SELECT * FROM users WHERE active = $1',
    [true]
  );

  return result.rows as User[];
}
```

### Step 4: Schema Inspection

```typescript
export async function analyzeDatabase(): Promise<void> {
  const client = await getDbClient();

  const schema = await client.getSchema();

  console.log(`Found ${schema.tables.length} tables:`);
  schema.tables.forEach((table) => {
    console.log(`- ${table.name} (${table.rowCount} rows)`);
  });
}
```

## Adding Code Generators

### Step 1: Create Generator Template

Create `src/generators/templates/my-generator.ts`:

```typescript
import type { GeneratorConfig, GeneratorResult } from '../../types/generators.js';

export async function generateMyFeature(
  config: GeneratorConfig
): Promise<GeneratorResult> {
  const files = [];

  // Generate file 1
  files.push({
    path: `src/${config.name.toLowerCase()}.ts`,
    content: generateMainFile(config),
    description: 'Main implementation file',
  });

  // Generate file 2
  if (config.options?.includeTests) {
    files.push({
      path: `src/${config.name.toLowerCase()}.test.ts`,
      content: generateTestFile(config),
      description: 'Test file',
    });
  }

  return {
    success: true,
    files,
    instructions: generateInstructions(config),
  };
}

function generateMainFile(config: GeneratorConfig): string {
  const { name } = config;
  return `// Generated ${name} implementation\n\nexport class ${name} {\n  // TODO: Implement\n}`;
}
```

### Step 2: Register Generator

In `src/generators/registry.ts`:

```typescript
const GENERATORS: GeneratorTemplate[] = [
  // ... existing generators
  {
    type: 'feature',
    framework: 'generic',
    language: 'typescript',
    description: 'Generate custom feature',
    requiredOptions: ['name'],
    generate: generateMyFeature,
  },
];
```

### Step 3: Add CLI Command

In `src/commands/generate.ts`, add action:

```typescript
case 'my-feature':
  await myFeatureCmd(args, options);
  break;
```

## Testing Integration

### Step 1: Unit Tests

Test individual components in isolation:

```typescript
// src/my-feature/index.test.ts
describe('My Feature', () => {
  it('should integrate with tool system', async () => {
    const result = await executeToolWithMyFeature();
    expect(result).toBeDefined();
  });
});
```

### Step 2: Integration Tests

Test feature interaction with other systems:

```typescript
describe('My Feature Integration', () => {
  it('should work with analytics', async () => {
    await clearAnalytics();

    await myFeatureWithTracking();

    const stats = await generateUsageStats();
    expect(stats.totalTools).toBeGreaterThan(0);
  });

  it('should work with caching', async () => {
    await clearCache();

    const result1 = await myFeatureWithCache();
    const result2 = await myFeatureWithCache();

    expect(result1).toEqual(result2);

    const stats = await getCacheStats();
    expect(stats.hitRate).toBeGreaterThan(0);
  });
});
```

### Step 3: End-to-End Tests

Test complete workflows:

```typescript
describe('End-to-End: My Feature', () => {
  it('should execute full workflow', async () => {
    // 1. Initialize
    await initMyFeature();

    // 2. Execute command
    const result = await myCommand('action', [], {});

    // 3. Verify analytics
    const stats = await generateUsageStats();
    expect(stats.totalSessions).toBe(1);

    // 4. Verify output
    expect(result).toBeDefined();
  });
});
```

## Checklist for New Integrations

Before marking integration complete:

- [ ] Types defined in `src/types/`
- [ ] Implementation in appropriate directory
- [ ] Registered with relevant systems (tools/commands/generators)
- [ ] Analytics tracking added
- [ ] Caching added for expensive operations
- [ ] Error handling implemented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Documentation updated (README, CLAUDE.md)
- [ ] Examples added to snippets if reusable
- [ ] CLI command added (if applicable)
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)

## Common Integration Patterns

### Pattern 1: Tool + Analytics + Cache

```typescript
export async function myToolWithFullIntegration(
  params: MyParams,
  sessionId: string
): Promise<string> {
  const startTime = Date.now();

  try {
    // Check cache first
    const cached = await getCache({
      type: 'my_tool',
      identifier: params.id,
      version: '1.0.0',
    });

    if (cached) {
      await trackToolExecution(sessionId, 'my_tool', Date.now() - startTime, true);
      return cached;
    }

    // Execute tool
    const result = await performOperation(params);

    // Store in cache
    await setCache(
      { type: 'my_tool', identifier: params.id, version: '1.0.0' },
      result
    );

    // Track success
    await trackToolExecution(sessionId, 'my_tool', Date.now() - startTime, true);

    return result;
  } catch (error) {
    // Track error
    await trackError(
      sessionId,
      'my_tool_error',
      error instanceof Error ? error.message : String(error)
    );

    await trackToolExecution(sessionId, 'my_tool', Date.now() - startTime, false);

    throw error;
  }
}
```

### Pattern 2: Command + Database + Generator

```typescript
export async function myCommandWithDB(
  action: string,
  args: string[],
  options: MyOptions
): Promise<void> {
  // 1. Connect to database
  const db = await createPostgresClient(getDatabaseConfig());

  try {
    // 2. Query data
    const data = await db.query('SELECT * FROM templates WHERE type = $1', [action]);

    // 3. Generate code using template
    const generator = findGenerator('my_type', 'express', 'typescript');
    if (!generator) {
      throw new Error('Generator not found');
    }

    const result = await generator.generate({
      type: 'my_type',
      framework: 'express',
      language: 'typescript',
      name: args[0],
    });

    // 4. Save generated files
    for (const file of result.files) {
      await writeFile(file.path, file.content);
    }

    console.log(chalk.green('✓ Generated successfully'));
  } finally {
    await db.close();
  }
}
```

## Troubleshooting Integration Issues

### Issue: Type errors with exactOptionalPropertyTypes

**Solution:** Always include `| undefined` for optional properties:

```typescript
// ❌ Wrong
interface Config {
  option?: string;
}

// ✅ Correct
interface Config {
  option?: string | undefined;
}
```

### Issue: Import errors (module not found)

**Solution:** Always end imports with `.js`:

```typescript
// ❌ Wrong
import { helper } from './utils';

// ✅ Correct
import { helper } from './utils.js';
```

### Issue: Tests fail in isolation but pass individually

**Solution:** Ensure proper cleanup in `afterEach`:

```typescript
afterEach(async () => {
  await clearCache();
  await clearAnalytics();
  // Clear any other shared state
});
```

---

**Remember:** Integration is about making systems work together seamlessly. Follow these patterns, test thoroughly, and maintain consistency with the existing codebase.
