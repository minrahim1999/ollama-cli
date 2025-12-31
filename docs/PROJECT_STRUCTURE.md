# Project Structure

This document provides a visual overview of the Ollama CLI project structure.

```
ollama-cli/
├── src/                          # Source code (TypeScript)
│   ├── api/                      # Ollama API client
│   │   └── client.ts             # HTTP client with streaming support
│   │
│   ├── commands/                 # CLI command handlers
│   │   ├── ask.ts                # One-shot ask command
│   │   ├── chat.ts               # Interactive chat REPL
│   │   ├── config.ts             # Configuration management command
│   │   └── models.ts             # Models listing command
│   │
│   ├── config/                   # Configuration management
│   │   ├── index.ts              # Config read/write/merge logic
│   │   └── index.test.ts         # Configuration tests
│   │
│   ├── session/                  # Session management
│   │   ├── index.ts              # Session persistence and CRUD
│   │   └── index.test.ts         # Session tests
│   │
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # All interfaces and types
│   │
│   ├── ui/                       # Terminal UI utilities
│   │   ├── display.ts            # Formatting, colors, tables
│   │   ├── display.test.ts       # Display utility tests
│   │   └── spinner.ts            # Loading spinners
│   │
│   ├── cli.ts                    # Main CLI entry point (executable)
│   └── index.ts                  # Public API exports
│
├── docs/                         # Documentation
│   ├── API.md                    # Programmatic API documentation
│   └── ARCHITECTURE.md           # Architecture and design decisions
│
├── examples/                     # Usage examples
│   ├── schema-example.json       # Example JSON schema
│   └── usage.sh                  # Example shell commands
│
├── dist/                         # Compiled output (created by build)
│   └── [generated .js files]
│
├── .env.example                  # Example environment variables
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
├── .npmignore                    # NPM publish ignore rules
├── .prettierrc.json              # Prettier formatting config
├── CHANGELOG.md                  # Version history
├── CONTRIBUTING.md               # Contribution guidelines
├── LICENSE                       # MIT License
├── README.md                     # Main documentation
├── package.json                  # NPM package configuration
├── tsconfig.json                 # TypeScript compiler config
└── vitest.config.ts              # Test runner configuration
```

## Key Files

### Entry Points

- **src/cli.ts** - CLI executable entry point with shebang
- **src/index.ts** - Programmatic API entry point

### Core Modules

- **src/api/client.ts** - Ollama REST client with streaming
- **src/config/index.ts** - Configuration layer
- **src/session/index.ts** - Session persistence
- **src/types/index.ts** - Type definitions

### Commands

Each command is self-contained in `src/commands/`:
- `ask.ts` - Quick one-shot responses
- `chat.ts` - Interactive REPL
- `config.ts` - Configuration management
- `models.ts` - Model listing

### UI Components

- **display.ts** - Formatting functions (tables, colors, messages)
- **spinner.ts** - Loading indicators

## Build Output

After running `npm run build`, the `dist/` directory contains:

```
dist/
├── api/
│   └── client.js
├── commands/
│   ├── ask.js
│   ├── chat.js
│   ├── config.js
│   └── models.js
├── config/
│   └── index.js
├── session/
│   └── index.js
├── types/
│   └── index.js
├── ui/
│   ├── display.js
│   └── spinner.js
├── cli.js                        # Executable with shebang
└── index.js                      # Public API
```

Plus corresponding `.d.ts` type definition files.

## Configuration & Sessions

At runtime, the CLI creates:

```
~/.ollama-cli/
├── config.json                   # User configuration
└── sessions/                     # Saved chat sessions
    ├── <uuid-1>.json
    ├── <uuid-2>.json
    └── ...
```

## Development Files

### Configuration
- `.eslintrc.json` - Code linting rules
- `.prettierrc.json` - Code formatting rules
- `tsconfig.json` - TypeScript compiler options
- `vitest.config.ts` - Test runner settings

### Publishing
- `.npmignore` - Files excluded from npm package
- `package.json` - Package metadata and scripts

### Documentation
- `README.md` - User documentation
- `CONTRIBUTING.md` - Contributor guide
- `CHANGELOG.md` - Version history
- `docs/API.md` - API reference
- `docs/ARCHITECTURE.md` - Technical architecture

## File Count

- **Source files**: 12 TypeScript files
- **Test files**: 3 test files
- **Config files**: 6 configuration files
- **Documentation**: 6 documentation files
- **Total**: 31 files (excluding node_modules)

## Module Relationships

```
cli.ts
  ├─> commands/
  │     ├─> ask.ts ──────┐
  │     ├─> chat.ts ─────┤
  │     ├─> config.ts ───┤
  │     └─> models.ts ───┤
  │                       │
  │                       ├─> api/client.ts
  │                       ├─> config/index.ts
  │                       ├─> session/index.ts
  │                       ├─> ui/display.ts
  │                       ├─> ui/spinner.ts
  │                       └─> types/index.ts
  │
  └─> index.ts (public API)
```

## Testing Structure

Tests are co-located with their modules:
- `config/index.test.ts` - Tests for configuration
- `session/index.test.ts` - Tests for sessions
- `ui/display.test.ts` - Tests for UI utilities

Run with: `npm test`
