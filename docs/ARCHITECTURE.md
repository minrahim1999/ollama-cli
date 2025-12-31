# Architecture

This document describes the architecture and design decisions of Ollama CLI.

## Project Structure

```
ollama-cli/
├── src/
│   ├── api/              # Ollama API client
│   │   └── client.ts     # HTTP client with streaming support
│   ├── commands/         # CLI command handlers
│   │   ├── ask.ts        # One-shot ask command
│   │   ├── chat.ts       # Interactive chat REPL
│   │   ├── config.ts     # Configuration management
│   │   └── models.ts     # Models listing
│   ├── config/           # Configuration layer
│   │   ├── index.ts      # Config read/write/merge
│   │   └── index.test.ts # Config tests
│   ├── session/          # Session management
│   │   ├── index.ts      # Session CRUD operations
│   │   └── index.test.ts # Session tests
│   ├── types/            # TypeScript definitions
│   │   └── index.ts      # All type definitions
│   ├── ui/               # Terminal UI utilities
│   │   ├── display.ts    # Formatting and colors
│   │   ├── spinner.ts    # Loading indicators
│   │   └── display.test.ts
│   ├── cli.ts            # Main CLI entry point
│   └── index.ts          # Public API exports
├── examples/             # Usage examples
├── docs/                 # Documentation
└── dist/                 # Compiled output
```

## Design Principles

### 1. Separation of Concerns

Each module has a single responsibility:

- **api/**: Network communication with Ollama
- **commands/**: User-facing command logic
- **config/**: Configuration persistence
- **session/**: Conversation state management
- **ui/**: Terminal rendering
- **types/**: Shared type definitions

### 2. Type Safety

- Strict TypeScript mode enabled
- No implicit `any` types
- Checked indexed access
- Comprehensive type definitions for all APIs

### 3. Error Handling

Errors are handled at multiple layers:

```typescript
// API layer - converts network errors to user-friendly messages
throw new Error('Cannot connect to Ollama. Is it running?');

// Command layer - displays errors and exits with proper code
catch (error) {
  displayError(error.message);
  process.exit(1);
}
```

### 4. Configuration Hierarchy

Configuration sources in priority order:

1. CLI flags (highest)
2. Environment variables
3. Config file (`~/.ollama-cli/config.json`)
4. Hardcoded defaults (lowest)

## Key Components

### OllamaClient

The HTTP client handles:

- Streaming responses via Server-Sent Events
- Request timeout with AbortController
- Error handling and connection detection
- JSON parsing of ndjson responses

**Key implementation:**
```typescript
async *chat(params: ChatRequestParams) {
  // Use ReadableStream for efficient streaming
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Buffer incomplete JSON chunks
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // Process complete lines
  }
}
```

### Session Management

Sessions are persisted as JSON files:

- Location: `~/.ollama-cli/sessions/<id>.json`
- Atomic writes using temp file + rename
- Auto-generate UUIDs for session IDs
- Support named sessions for easy recall

**Schema:**
```json
{
  "id": "uuid-v4",
  "name": "optional-name",
  "model": "llama2",
  "messages": [...],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### Chat REPL

The interactive chat uses Node.js readline:

- Non-blocking event-driven architecture
- Graceful Ctrl+C handling
- Command system with `/` prefix
- Real-time streaming with backpressure handling

**Flow:**
```
User Input → Message Buffer → API Request → Stream Response → Save Session
```

### UI Layer

Terminal rendering uses:

- **chalk**: ANSI color codes
- **ora**: Animated spinners
- **cli-table3**: Formatted tables

All UI functions are pure - they don't modify state, only render it.

## Data Flow

### Ask Command

```
CLI Args → Parse Options → Load Config → Create Client →
Stream Response → Display → Exit
```

### Chat Command

```
CLI Args → Load/Create Session → Start REPL →
  User Input → Update Session → Stream Response →
  Update Session → Continue REPL
```

## Testing Strategy

### Unit Tests

- Configuration read/write/merge
- Session CRUD operations
- Utility functions (formatBytes, formatRelativeTime)

### Integration Tests

- Mock Ollama API responses
- Full command flows
- Session persistence
- Error scenarios

### Coverage Goals

- Maintain >80% code coverage
- Test all error paths
- Test configuration merging
- Test streaming edge cases

## Performance Considerations

### Startup Time

Keep CLI startup under 200ms:
- Use ESM for faster loading
- Lazy-load heavy dependencies
- Avoid synchronous I/O in hot paths

### Streaming

- Use native ReadableStream API
- Proper backpressure handling
- Buffer management for incomplete chunks
- Non-blocking terminal writes

### Memory

- Stream responses instead of buffering
- Prune large sessions (future enhancement)
- Release file handles promptly
- Clean up event listeners

## Security

### Input Validation

- Validate configuration values
- Sanitize file paths
- Validate JSON schemas before sending

### File System

- Use safe path joining
- Atomic writes for data integrity
- Proper error handling for I/O operations

### Network

- Validate URLs before connecting
- Timeout all requests
- Handle connection errors gracefully

## Extension Points

The CLI is designed for future enhancements:

1. **Plugin System**: Commands can be added via `src/commands/`
2. **Custom UI Themes**: UI functions in `src/ui/` are swappable
3. **Alternative Backends**: API client can be replaced
4. **Session Formats**: Session serialization is abstracted

## Build Process

```
TypeScript Source → tsc → JavaScript ESM → dist/
```

- Input: `src/**/*.ts`
- Output: `dist/**/*.js`
- Includes: Type declarations (`.d.ts`)
- Excludes: Test files, examples

## Publishing

The package is published to npm with:

- Compiled JavaScript in `dist/`
- Type definitions for TypeScript users
- Executable with shebang: `#!/usr/bin/env node`
- Proper `bin` entry in package.json

## Future Enhancements

1. **Multi-modal Support**: Handle images in chat
2. **Session Pruning**: Limit message history size
3. **Model Management**: Pull/delete models via CLI
4. **Custom Prompts**: Template system for common tasks
5. **Export Formats**: Save conversations as Markdown/HTML
6. **Shell Completion**: Tab completion for commands
