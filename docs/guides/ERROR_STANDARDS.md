# Error Message Standards

## Error Types

### 1. User-Facing Errors
Clear, actionable messages for end users:

```typescript
// Configuration errors
throw new Error('Configuration file not found. Run "ollama-cli init" to create it.');

// Validation errors
throw new Error('Invalid model name. Use "ollama-cli config list-models" to see available models.');

// Permission errors
throw new Error('Permission denied. Enable file writing with "ollama-cli config set canWriteFiles true".');

// Not found errors
throw new Error('Session not found. List sessions with "ollama-cli session list".');
```

### 2. Developer Errors
Technical details for debugging:

```typescript
// Invalid state
throw new Error('Invalid state: session.messages is undefined');

// Type errors
throw new Error('Expected string, got number');

// Missing dependencies
throw new Error('PostgreSQL client not installed. Run: npm install pg');
```

## Error Format

**Structure:** `[Category]: [Problem]. [Solution]`

```typescript
// ✅ Good
throw new Error('Database connection failed: Invalid credentials. Check your .env file.');

// ❌ Bad
throw new Error('Error');
```

## Error Categories

- **Config**: Configuration issues
- **Validation**: Input validation failures
- **Permission**: Permission/authorization issues
- **NotFound**: Resource not found
- **Network**: Network/connection issues
- **FileSystem**: File operation failures
- **Database**: Database errors
- **Tool**: Tool execution failures

## CLI Error Display

```typescript
try {
  await operation();
} catch (error) {
  console.error(chalk.red('✗ Error:'), error.message);
  if (verbose) {
    console.error(chalk.gray(error.stack));
  }
  process.exit(1);
}
```

## Wrapping Errors

```typescript
try {
  await riskyOperation();
} catch (error) {
  throw new Error(
    `Failed to execute operation: ${error instanceof Error ? error.message : String(error)}`
  );
}
```
