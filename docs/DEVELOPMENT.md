# Development Guide

This guide covers everything you need to know for developing and maintaining Ollama CLI.

## Setup

### Initial Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link for local testing
npm link

# Verify installation
ollama-cli --help
```

### Development Workflow

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# In another terminal, test changes
ollama-cli chat
```

## Project Scripts

```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean

# Prepare for publishing (runs automatically)
npm run prepublishOnly
```

## Code Standards

### TypeScript

- **Strict mode enabled**: No implicit any, undefined checks required
- **Type everything**: No `any` types unless absolutely necessary
- **Use interfaces**: Define interfaces in `src/types/index.ts`
- **Export types**: Export all public types for consumers

### Code Style

```typescript
// Good - explicit types
async function loadConfig(): Promise<OllamaConfig> {
  // ...
}

// Bad - implicit any
async function loadConfig() {
  return config;
}
```

### Error Handling

```typescript
// Good - user-friendly errors
catch (error) {
  if (error instanceof Error) {
    displayError(error.message, 'Try: ollama serve');
  }
  process.exit(1);
}

// Bad - raw errors
catch (error) {
  console.error(error);
  throw error;
}
```

### Async/Await

```typescript
// Good - async/await
const config = await loadConfig();
const session = await createSession(model);

// Bad - promise chains
loadConfig().then(config => {
  return createSession(model);
});
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/config/index.test.ts

# Generate coverage report
npm run test:coverage
```

### Writing Tests

Create test files next to the code they test:

```
src/
  config/
    index.ts
    index.test.ts  <-- test file
```

Example test:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig } from './index.js';

describe('Configuration', () => {
  beforeEach(async () => {
    // Setup
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should load default config', async () => {
    const config = await loadConfig();
    expect(config.baseUrl).toBe('http://localhost:11434/api');
  });
});
```

### Test Coverage Goals

- Maintain >80% overall coverage
- 100% coverage for critical paths (API client, session management)
- Test error cases, not just happy paths

## Adding New Features

### 1. Adding a New Command

1. Create command file: `src/commands/mycommand.ts`

```typescript
import { displaySuccess, displayError } from '../ui/display.js';

export async function myCommand(options: MyOptions): Promise<void> {
  try {
    // Command logic
    displaySuccess('Command completed');
    process.exit(0);
  } catch (error) {
    displayError(error.message);
    process.exit(1);
  }
}
```

2. Register in `src/cli.ts`:

```typescript
program
  .command('mycommand')
  .description('My new command')
  .option('-o, --option <value>', 'An option')
  .action(async (options) => {
    await myCommand(options);
  });
```

3. Add tests: `src/commands/mycommand.test.ts`

4. Update documentation: `README.md`

### 2. Adding New Configuration Options

1. Update type in `src/types/index.ts`:

```typescript
export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
  myNewOption: string;  // Add new option
}
```

2. Update defaults in `src/config/index.ts`:

```typescript
const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434/api',
  defaultModel: 'llama2',
  timeoutMs: 30000,
  myNewOption: 'default-value',
};
```

3. Add validation in `setConfigValue()` if needed

4. Update documentation

### 3. Extending the API Client

1. Add method to `src/api/client.ts`:

```typescript
async myNewMethod(params: MyParams): Promise<MyResponse> {
  const url = `${this.baseUrl}/my-endpoint`;
  // Implementation
}
```

2. Add types to `src/types/index.ts`

3. Export from `src/index.ts` if public API

4. Add tests

## Debugging

### Enable Debug Mode

```bash
# Environment variable
OLLAMA_CLI_DEBUG=1 ollama-cli chat

# Or add debug logging in code
if (process.env.OLLAMA_CLI_DEBUG) {
  console.error('[DEBUG]', 'Message here');
}
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["chat"],
      "preLaunchTask": "npm: build",
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

**Issue**: Changes not reflected after build
**Solution**: Run `npm run clean && npm run build`

**Issue**: Import errors
**Solution**: Check `.js` extensions in imports (required for ESM)

**Issue**: Type errors
**Solution**: Run `npm run build` to see full TypeScript errors

## Performance

### Startup Time

Keep startup under 200ms:

```bash
# Measure startup time
time ollama-cli --help
```

Tips:
- Lazy-load heavy dependencies
- Avoid synchronous I/O at startup
- Use ESM (faster than CommonJS)

### Memory Usage

Monitor memory for long-running chat sessions:

```bash
# Run with memory profiling
node --expose-gc --trace-gc dist/cli.js chat
```

## Release Process

### 1. Version Bump

```bash
# Patch (1.0.0 -> 1.0.1)
npm version patch

# Minor (1.0.0 -> 1.1.0)
npm version minor

# Major (1.0.0 -> 2.0.0)
npm version major
```

### 2. Update Changelog

Edit `CHANGELOG.md`:

```markdown
## [1.1.0] - 2026-01-15

### Added
- New feature X

### Fixed
- Bug Y
```

### 3. Test Build

```bash
# Clean build
npm run clean
npm run build

# Test locally
npm link
ollama-cli --help
ollama-cli chat

# Run tests
npm test

# Check bundle size
du -sh dist/
```

### 4. Publish

```bash
# Dry run (see what would be published)
npm pack
tar -tzf ollama-cli-*.tgz

# Publish to npm
npm publish

# Verify
npm info ollama-cli
```

### 5. Tag Release

```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

## Best Practices

### 1. Error Messages

- Be specific about what went wrong
- Provide actionable suggestions
- Include relevant context

```typescript
// Good
throw new Error(
  `Cannot connect to Ollama at ${baseUrl}. ` +
  `Is Ollama running? Try: ollama serve`
);

// Bad
throw new Error('Connection failed');
```

### 2. User Feedback

- Show progress for long operations
- Use spinners for network requests
- Display success messages

```typescript
const spinner = startSpinner('Fetching models...');
const models = await client.listModels();
stopSpinner();
displaySuccess('Models loaded');
```

### 3. Input Validation

- Validate early (at command entry point)
- Provide clear error messages
- Check required parameters

```typescript
if (!prompt) {
  displayError('Prompt is required');
  process.exit(1);
}
```

### 4. Resource Cleanup

- Close file handles
- Clear event listeners
- Handle Ctrl+C gracefully

```typescript
process.on('SIGINT', async () => {
  await saveSession(session);
  process.exit(0);
});
```

## Architecture Decisions

### Why ESM?

- Faster startup time
- Better tree-shaking
- Modern JavaScript standard
- Native Node.js support (20+)

### Why Commander.js?

- Industry standard for Node CLIs
- Excellent TypeScript support
- Automatic help generation
- Flexible command structure

### Why Vitest?

- Fast (uses Vite)
- Great TypeScript support
- Compatible with Node.js testing
- Modern, actively maintained

### Why Not Axios?

- Native fetch is built-in (Node 20+)
- Smaller bundle size
- One less dependency
- Sufficient for our needs

## Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Commander.js](https://github.com/tj/commander.js)
- [Vitest](https://vitest.dev/)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [NPM Best Practices](https://docs.npmjs.com/packages-and-modules)
- [Semantic Versioning](https://semver.org/)

## Getting Help

- Read existing code and tests
- Check GitHub issues
- Review Ollama documentation
- Ask in team discussions
