# Code Snippets Library

This directory contains reusable code templates for common patterns in the Ollama CLI project.

## Available Snippets

### 1. Command Handler (`command-handler.ts`)
Template for creating new CLI command handlers with:
- Multiple action support
- Error handling
- Verbose mode
- Output saving
- Help text

**Usage:** Copy and replace `{{COMMAND}}` with your command name.

### 2. Type Definitions (`type-definition.ts`)
Template for creating comprehensive type definitions with:
- Main config interface
- Options interface
- Result types
- Metadata types
- Status and action enums
- Filter interfaces
- Event types

**Usage:** Copy and replace `{{MODULE}}` with your module name.

### 3. Test Suite (`test-suite.ts`)
Template for creating comprehensive test suites with:
- Setup/teardown hooks
- Feature groups
- Edge case testing
- Mocking examples
- Spy examples
- Async operation tests

**Usage:** Copy and replace `{{MODULE}}` with your module name.

### 4. Utility Functions (`utility-function.ts`)
Template for creating utility functions with:
- Input validation
- Error handling
- JSDoc comments
- Examples
- Sync/async variants
- File operations
- Array processing
- Type guards

**Usage:** Copy and replace `{{FUNCTION}}` and `{{MODULE}}` with appropriate names.

## How to Use

1. **Identify the pattern you need** from the available snippets
2. **Copy the snippet file** to your destination
3. **Find and replace placeholders**:
   - `{{COMMAND}}` → Your command name
   - `{{MODULE}}` → Your module name
   - `{{FUNCTION}}` → Your function name
4. **Customize the logic** for your specific use case
5. **Remove unused code** and TODOs

## Template Variables

All snippets use these placeholder variables:

- `{{COMMAND}}` - Command name (e.g., `analytics`, `generate`)
- `{{MODULE}}` - Module name (e.g., `Analytics`, `Cache`, `Generator`)
- `{{FUNCTION}}` - Function name (e.g., `processData`, `validateInput`)

## Best Practices

1. **Always validate inputs** before processing
2. **Include error handling** with descriptive messages
3. **Add JSDoc comments** for functions
4. **Write tests** for new functionality
5. **Follow TypeScript strict mode** (exactOptionalPropertyTypes)
6. **Use ESM imports** (end with `.js`)
7. **Handle edge cases** (empty input, nulls, errors)

## Examples

### Creating a new command handler

```bash
# 1. Copy the template
cp .ollama/snippets/command-handler.ts src/commands/export.ts

# 2. Replace {{COMMAND}} with 'export'
# 3. Customize actions and logic
# 4. Add to src/cli.ts
```

### Creating type definitions

```bash
# 1. Copy the template
cp .ollama/snippets/type-definition.ts src/types/export.ts

# 2. Replace {{MODULE}} with 'Export'
# 3. Customize interfaces for your needs
```

### Creating tests

```bash
# 1. Copy the template
cp .ollama/snippets/test-suite.ts src/export/index.test.ts

# 2. Replace {{MODULE}} with 'Export'
# 3. Import your functions
# 4. Write specific test cases
```

## Adding New Snippets

To add a new snippet to this library:

1. Create a new `.ts` file in this directory
2. Use `{{PLACEHOLDERS}}` for variable parts
3. Include comprehensive comments
4. Add examples in comments
5. Update this README with description

## Related Documentation

- [WRITE_FLOW.md](../WRITE_FLOW.md) - Comprehensive write flow guide
- [CLAUDE.md](../../CLAUDE.md) - Project architecture and patterns
- [PROJECT.md](../../PROJECT.md) - Project overview
