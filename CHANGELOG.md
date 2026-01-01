# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-01

### 🎨 Major UI Overhaul
- **Modern color system** with gradient support (cyan → blue theme)
- **Redesigned dashboard** with 2-column layout and cleaner typography
- **Enhanced message display** with minimal borders and better spacing
- **Improved tool execution UI** with condensed output and status icons
- **Better visual hierarchy** using semantic colors (primary, secondary, tertiary, dim)
- Added gradient-string library for headers and accents

### 📋 Template/Prompt Library
- **5 built-in templates**: Code Review, Documentation, Bug Fix, Refactor, Test Generation
- **Template CRUD operations**: create, list, show, use, edit, delete
- **Variable substitution** with `{{variable}}` syntax
- **Template categories**: code, documentation, git, general
- **CLI commands**: `ollama-cli template <command>`
- **REPL command**: `/template <name> [key=value...]`
- Template storage at `~/.ollama-cli/templates.json`

### 💾 Conversation Export/Import
- **Export formats**: JSON (full data), Markdown (readable), TXT (plain)
- **Import support**: JSON and Markdown with auto-detection
- **Session metadata preservation** including model, timestamps, message count
- **CLI commands**: `ollama-cli export <session-id>`, `ollama-cli import <file>`
- **REPL command**: `/export [format] [filename]`
- Pretty-print option for JSON exports

### 🔀 Enhanced Git Workflow
- **AI-generated commit messages** with conventional or simple style
- **PR summary generation** from branch diffs
- **Code review** of staged changes
- **Git operations wrapper** for status, diff, commits
- **Built-in git templates** for commit messages, PR descriptions, and reviews
- **CLI commands**: `ollama-cli git commit-msg`, `ollama-cli git pr-summary`, `ollama-cli git review`
- **REPL commands**: `/commit [style]`, `/review`
- Conventional commits support

### 🎯 Planning System (Full-Featured)
- **Smart plan detection** - Automatically identifies complex tasks requiring planning
- **Complexity analysis** - Analyzes requests with confidence scoring (low/medium/high)
- **Plan storage** - Saves plans in JSON + Markdown at `~/.ollama-cli/plans/`
- **Plan structure** - Steps with type, status, complexity, files, results
- **Step types**: explore, create, modify, delete, execute, test
- **Plan execution framework** - Step-by-step execution with progress tracking
- **Plan management**: list, show, delete plans
- **CLI commands**: `ollama-cli plan <command>`
- **REPL commands**: `/plan <task>`, `/plans`
- **Auto-planning** enabled by default (configurable)
- **Plan lifecycle**: detection → creation → planning → approval → execution → completion

### ⚙️ Configuration Updates
- Added `autoPlan` config option (default: true)
- Updated config commands to support boolean values
- Enhanced config validation for new fields

### 🎮 New REPL Commands
- `/template <name>` - Use prompt template with variables
- `/export [format]` - Export conversation to file
- `/commit [style]` - Generate git commit message
- `/review` - Review staged git changes
- `/plan <task>` - Create implementation plan
- `/plans` - List all plans

### 📚 Enhanced Documentation
- Updated help display with new command categories
- Added Planning section to help
- Added Git Workflow section to help
- Added Templates & Export section to help
- Comprehensive command examples in all features

### 🛠️ Technical Improvements
- Added gradient-string for terminal gradients
- Improved TypeScript type safety
- Enhanced error handling across all new features
- Better separation of concerns (planning, templates, export, git modules)
- Atomic file writes for all storage operations

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
