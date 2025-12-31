# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-01

### Added
- Interactive chat command with REPL interface
- One-shot ask command for quick responses
- JSON generation with schema validation
- Session management and persistence
- Configuration management (baseUrl, defaultModel, timeoutMs)
- Models listing command
- Streaming response support
- Environment variable overrides
- Offline detection with helpful error messages
- Color-coded terminal output
- Loading spinners for better UX
- Comprehensive documentation
- Unit and integration tests

### Features
- `/help` - Show available commands in chat
- `/models` - List models during chat session
- `/clear` - Clear conversation history
- `/save` - Save current session
- `/load` - Load previous session
- `/exit` - Exit chat session
- `--json` - Generate JSON with schema validation
- `--raw` - Output raw responses
- `--system` - Set system prompts
- `--model` - Override default model

### Technical
- TypeScript with strict mode
- ESM module system
- Commander.js for CLI parsing
- Native fetch for HTTP requests
- Chalk for terminal colors
- Ora for loading spinners
- Vitest for testing
- ESLint and Prettier for code quality
