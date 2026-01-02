# Project-Specific Style Guide

## TypeScript Strict Mode

**exactOptionalPropertyTypes: true**
```typescript
// ✅ Correct
interface Config {
  name?: string | undefined;
}

// ❌ Wrong
interface Config {
  name?: string;
}
```

## ESM Imports

**Always end imports with `.js`:**
```typescript
import { helper } from './utils.js';
import type { Config } from '../types/config.js';
```

## Naming Conventions

- **Files**: `kebab-case.ts`
- **Functions**: `camelCase()`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

## Preferred Libraries

- **CLI**: Commander.js
- **Terminal UI**: Chalk, gradient-string, ora
- **Testing**: Vitest
- **Database**: better-sqlite3, pg, mysql2
- **HTTP**: Native fetch API

## Error Handling

**User-facing:**
```typescript
console.error(chalk.red('✗ Error:'), error.message);
process.exit(1);
```

**Function-level:**
```typescript
throw new Error(`Operation failed: ${error.message}`);
```

## Async/Await

Always prefer async/await over promises:
```typescript
// ✅ Correct
const data = await readFile(path);

// ❌ Wrong
readFile(path).then(data => { /* ... */ });
```

## Type Safety

Prefer `unknown` over `any`:
```typescript
// ✅ Correct
function process(data: unknown): string {
  if (typeof data === 'string') return data;
  return JSON.stringify(data);
}

// ❌ Wrong
function process(data: any): string {
  return data.toString();
}
```
