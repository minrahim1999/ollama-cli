# Ollama CLI - Project Context

<!--
  PROJECT.md - Project Context for Ollama CLI

  This file helps the AI assistant understand the project better.
  Auto-updated by ollama-cli after significant conversations.
-->

## Overview

**Version:** 2.5.0
**Description:** Professional, feature-rich CLI for Ollama - chat with AI models, manage templates, execute code, plan implementations, and streamline your local LLM workflow from the terminal.

**Key Features:**
- Interactive chat with 25+ MCP tools (file operations, git, code execution)
- Automatic snapshot/rollback system for file changes
- Template library with variable substitution
- Planning system with auto-detection
- Git workflow automation (commit messages, PR summaries, code review)
- Codebase indexing and test integration
- Workflow automation, database tools, RAG system, and API testing
- Batch processing, conversation branching, context management
- Agent system with framework-specific AI assistants
- Interactive command autocomplete and keyboard navigation
- First-run setup with model verification and base URL configuration

## Project Structure

```
ollama-cli/
├── src/                    # Source code
│   ├── api/               # Ollama API client & HTTP client
│   ├── tools/             # MCP tool system (25+ tools)
│   ├── memory/            # Snapshot system
│   ├── session/           # Conversation persistence
│   ├── assistants/        # Assistant management
│   ├── agents/            # Agent system (parser, manager, creator)
│   ├── batch/             # Batch processing
│   ├── branches/          # Conversation branching
│   ├── context/           # Context management
│   ├── diff/              # Diff generation/parsing
│   ├── prompts/           # Prompt library
│   ├── project/           # Project context & permissions
│   ├── templates/         # Template library
│   ├── export/            # Conversation export/import
│   ├── git/               # Git operations
│   ├── planning/          # Planning system
│   ├── indexing/          # Codebase indexing
│   ├── testing/           # Test integration
│   ├── workflows/         # Workflow automation
│   ├── database/          # Database tools (SQLite)
│   ├── rag/               # RAG system (vector embeddings)
│   ├── setup/             # First-run setup & model verification
│   ├── commands/          # Command handlers
│   ├── config/            # Configuration management
│   ├── ui/                # Display & syntax highlighting
│   ├── utils/             # Utilities (keyboard nav, prompts, autocomplete)
│   └── types/             # TypeScript type definitions
├── docs/                  # Documentation
├── dist/                  # Compiled output
└── tests/                 # Test files (78 tests, vitest)
```

## Tech Stack

**Languages:** TypeScript (strict mode), JavaScript
**Runtime:** Node.js 20+
**Package Manager:** npm
**CLI Framework:** Commander.js
**Testing:** Vitest (78 passing tests)
**Database:** better-sqlite3 (SQLite)
**HTTP:** Native fetch API
**Terminal UI:** Chalk, gradient-string, ora
**Code Quality:** ESLint, Prettier

## Architecture

### Layer Separation
1. **CLI Entry** (`src/cli.ts`) - Routes commands via Commander.js
2. **Commands** (`src/commands/`) - Command handlers
3. **Core Systems** - Business logic (tools, memory, session, agents, etc.)
4. **UI Layer** (`src/ui/`) - Display functions (pure, no state mutation)

### Key Patterns
- **Tool System**: Registry → Executor → Implementation
- **Snapshot System**: SHA-256 hashing for integrity verification
- **Assistant System**: 6 built-in assistants with different system prompts
- **Agent System**: Markdown-based definitions with YAML frontmatter
- **Configuration Hierarchy**: CLI flags → Env vars → Config file → Defaults

## Recent Updates (v2.5.0 - 2026-01-02)

### Base URL Configuration
- Added interactive base URL prompt during first-run setup
- Offers default (http://localhost:11434) or custom URL option
- Validates URL format and tests connection before saving
- Saves to `~/.ollama-cli/config.json` (no .env files needed)
- Supports configuration management via `ollama-cli config` commands
- Priority: OLLAMA_BASE_URL env → config.json → default

**Implementation:**
- `src/setup/index.ts` - `promptForBaseUrl()`, `testOllamaConnection()`
- `src/commands/config.ts` - Enhanced with `autoPlan` and `baseUrl` keys
- `src/config/index.ts` - Configuration loading and merging

## Key Files and Directories

### Core Implementation
- `src/cli.ts` - Main CLI entry point, command routing
- `src/api/client.ts` - Ollama API client with streaming support
- `src/tools/registry.ts` - Tool definitions (26 tools)
- `src/tools/executor.ts` - Tool execution with snapshots
- `src/memory/index.ts` - Snapshot system with rollback
- `src/agents/parser.ts` - Markdown agent definition parser
- `src/setup/index.ts` - First-run setup and model verification

### Configuration
- `~/.ollama-cli/config.json` - Global configuration
- `~/.ollama-cli/setup.json` - Setup state
- `.ollama/config.json` - Project-specific permissions
- `.ollama/agents/*.md` - Project-specific agents
- `~/.ollama-cli/agents/*.md` - Global agents

### Storage
- `~/.ollama-cli/sessions/` - Conversation sessions
- `~/.ollama-cli/snapshots/` - File change snapshots
- `~/.ollama-cli/templates.json` - Prompt templates
- `~/.ollama-cli/prompts.json` - Enhanced prompt library
- `~/.ollama-cli/plans/` - Implementation plans
- `~/.ollama-cli/index/` - Codebase index
- `~/.ollama-cli/rag/` - Vector store for RAG
- `.ollama/workflows/*.yml` - Project workflows

## Development Guidelines

### Code Style
- TypeScript strict mode with `exactOptionalPropertyTypes: true`
- All optional properties must have `| undefined`
- ESM modules with `.js` imports
- Use `fs/promises` for async file operations
- Functional UI components (no state mutation)

### Testing
```bash
npm test                 # Run all tests (vitest)
npm test:coverage        # With coverage report
npm test src/config      # Specific module
```

### Build & Development
```bash
npm run build            # Compile TypeScript
npm run dev              # Watch mode (tsc --watch)
npm run lint             # ESLint
npm run format           # Prettier
npm run clean            # Remove dist/
```

### Git Workflow
- Feature branches from `main`
- Pre-commit hook runs: build → tests → lint
- Conventional commit messages
- AI-generated commit messages via `/commit` command

## Common Tasks

### Local Testing
```bash
npm run build
node dist/cli.js chat --tools
```

### Adding New Tools
1. Add to `src/types/tools.ts` (ToolName type)
2. Add definition to `src/tools/registry.ts`
3. Implement in `src/tools/implementations.ts` or separate file
4. Add case in `src/tools/executor.ts`
5. Set `needsSnapshot: true` if modifies files

### Adding New Agents
```bash
ollama-cli agent create   # Interactive creation
# Or manually edit .md files in ~/.ollama-cli/agents/
```

### Configuration
```bash
ollama-cli config set baseUrl http://custom:11434
ollama-cli config set defaultModel llama3.2
ollama-cli config set autoPlan false
ollama-cli config list
```

## Important Context

### Dependencies
- **commander** - CLI argument parsing
- **chalk** - Terminal colors
- **gradient-string** - Gradient text effects
- **ora** - Loading spinners
- **yaml** - YAML parsing for workflows
- **better-sqlite3** - SQLite database
- **readline** - Interactive prompts

### Patterns Used
- **Singleton pattern** for OllamaClient
- **Registry pattern** for tools
- **Factory pattern** for assistants
- **Observer pattern** for streaming responses
- **Strategy pattern** for different assistant behaviors

### Known Issues & Technical Debt
- Linting warnings exist but pre-commit hook is non-blocking
- Test files not included in tsconfig.json (parsing errors in ESLint)
- Token estimation uses rough 4 chars/token heuristic (should use tiktoken)
- RAG summarization not yet implemented (placeholder)
- Diff application (`applyDiff`) not yet implemented

## Custom Instructions for AI

When working on this project:

1. **Follow Existing Patterns**
   - Use the registry → executor → implementation pattern for tools
   - Keep UI functions pure (no state mutations)
   - Use TypeScript strict mode (all optional props need `| undefined`)

2. **Testing Requirements**
   - Write tests for new features (vitest)
   - Ensure all tests pass before committing
   - Mock file system and network calls in tests

3. **Documentation**
   - Update CHANGELOG.md for new features
   - Update CLAUDE.md for architectural changes
   - Update README.md for user-facing features
   - Keep PROJECT.md current with major changes

4. **Backwards Compatibility**
   - Don't break existing config files
   - Support migration for storage format changes
   - Maintain CLI command compatibility

5. **Safety First**
   - Mark dangerous tools as `dangerous: true`
   - Create snapshots before file modifications
   - Validate user input before operations
   - Use sandboxing for file path access

6. **User Experience**
   - Provide clear error messages with troubleshooting steps
   - Use color-coded terminal output
   - Show progress for long-running operations
   - Confirm dangerous operations

## Tags

#cli #ollama #ai #llm #chat #coding-assistant #tools #mcp #typescript #nodejs #development

---

**Last updated:** 2026-01-02 (v2.5.0)
**Auto-updated by:** ollama-cli conversation system
