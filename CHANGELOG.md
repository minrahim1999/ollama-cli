# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-01-01

### 🎯 Core Enhancements

#### 📦 Batch Processing
- **Batch prompt execution** - Process multiple prompts from JSON or text files
- **Variable substitution** - Dynamic variables in batch prompts
- **Result aggregation** - Save batch execution results to JSON
- **Two file formats** - JSON (structured) or TXT (line-by-line)
- **Progress tracking** - Monitor batch execution progress

**Features:**
- Load prompts from JSON with id, prompt, and variables
- Load prompts from text files (one prompt per line)
- Execute prompts in sequence or parallel
- Save results with status, timing, and output
- Error handling for failed prompts

**Usage:**
```typescript
// Load batch file
const prompts = await loadBatchFile('prompts.json');

// Execute batch
const results = await executeBatch(prompts);

// Save results
await saveBatchResults(results, 'results.json');
```

#### 🌿 Conversation Branching
- **Git-like branching** - Create multiple conversation branches
- **Branch switching** - Switch between different conversation paths
- **Branch management** - List, create, delete branches
- **Message isolation** - Each branch maintains its own message history
- **Active branch tracking** - Know which branch you're currently on

**Features:**
- Initialize with main branch
- Create branches at any point in conversation
- Switch between branches without losing context
- Update branch messages independently
- Track branch metadata (name, parent, created time)
- List all branches with active status

**Use Cases:**
- Explore different conversation directions
- Compare AI responses to same prompt
- Maintain multiple solution approaches
- A/B testing conversation flows

#### 🧠 Context Management
- **Token budget control** - Set and enforce token limits
- **Smart message filtering** - Filter by role, content, metadata
- **Token estimation** - Estimate token count for messages
- **Context statistics** - Track token usage and message counts
- **Auto-summarization** - Automatic context compression (configurable)
- **File inclusion** - Control whether to include file contents

**Features:**
- Define context filtering rules (include/exclude patterns)
- Set token budgets to prevent context overflow
- Estimate tokens using ~4 chars per token heuristic
- Get context statistics (total tokens, messages, filtered count)
- Add rules dynamically during conversation
- Enable/disable auto-summarization

**Context Configuration:**
```typescript
{
  rules: ContextRule[],           // Filtering rules
  tokenBudget?: number,            // Max tokens allowed
  autoSummarize: boolean,          // Auto-compress context
  includeFiles: boolean,           // Include file contents
  priorityMessages?: string[]      // Always-include message IDs
}
```

#### 📝 Diff-Based Code Application
- **Unified diff generation** - Generate standard unified diffs
- **Diff parsing** - Parse diffs into structured hunks
- **File path extraction** - Extract file paths from diff headers
- **Multi-file support** - Handle diffs across multiple files
- **Diff preview** - Preview changes before applying
- **Safe application** - Validate diffs before modifying files

**Features:**
- Generate diffs between old and new content
- Parse unified diff format into structured data
- Extract file paths from diff headers (a/file.ts, b/file.ts)
- Support for additions, deletions, modifications
- Hunk-based change tracking
- Line number and context preservation

**Diff Format Support:**
- Unified diff format (--- / +++ headers)
- Context lines (unchanged)
- Addition lines (+)
- Deletion lines (-)
- Hunk headers (@@ -old +new @@)

#### 📋 Prompt Library Enhancement
- **Prompt CRUD operations** - Create, read, update, delete prompts
- **Variable extraction** - Auto-detect {{variables}} in prompts
- **Prompt rendering** - Substitute variables with values
- **Prompt search** - Search by name, content, tags, category
- **Tag system** - Organize prompts with multiple tags
- **Categories** - Group prompts by category (code, docs, etc.)
- **Storage** - Persisted in `~/.ollama-cli/prompts.json`

**Features:**
- Create prompts with metadata (name, content, category, tags)
- Extract variables from prompt templates ({{var}} syntax)
- Render prompts with variable substitution
- Search prompts across all fields
- Update existing prompts
- Delete prompts by name
- List all prompts with filtering

**Prompt Structure:**
```typescript
{
  name: string,
  content: string,           // Template with {{variables}}
  description?: string,
  category?: string,
  tags: string[],
  variables: string[],       // Auto-extracted
  createdAt: string,
  updatedAt: string
}
```

**Example:**
```typescript
// Create prompt
await createPrompt({
  name: 'code-review',
  content: 'Review this {{language}} code in {{file}}',
  category: 'code',
  tags: ['review', 'quality']
});

// Render with variables
const result = renderPrompt(prompt, {
  language: 'TypeScript',
  file: 'app.ts'
});
// Output: "Review this TypeScript code in app.ts"
```

### 🔧 Technical Improvements
- Comprehensive test coverage for all new modules (78 passing tests)
- TypeScript strict mode compliance
- Proper module isolation with mocks for testing
- Consistent error handling patterns
- Atomic file operations for data persistence
- Type-safe interfaces for all new features

### 🐛 Bug Fixes
- **Test isolation** - Fixed session tests reading from production directory
- **Mock configuration** - Proper vitest mocks for config module
- **Test cleanup** - Consistent beforeEach/afterEach patterns

## [2.3.0] - 2026-01-01

### ⚡ Interactive Command Autocomplete

#### Smart Command Helper
- **Real-time autocomplete** - Type "/" to see all available REPL commands
- **Live search filtering** - Commands filter as you type (e.g., "/e" shows /export, /exit)
- **Keyboard navigation** - Arrow keys (↑↓) to navigate, Tab/Enter to select
- **Visual preview** - See command descriptions and usage examples
- **Fuzzy matching** - Matches command names and descriptions
- **Instant help** - Quick reference for all 25+ REPL commands

**How It Works:**
```bash
# In chat, type "/" to trigger autocomplete
You: /

# Autocomplete shows all commands
Commands (use ↑↓ to navigate, Tab/Enter to select, Esc to cancel):
❯ /help - Show help
  /new - Start new conversation
  /tools - List all tools
  ...

# Type more to filter
You: /e

# Shows only matching commands
Commands:
❯ /export - Export conversation
    /export [format] [filename]
  /exit - Exit chat
  ...

# Use arrow keys to navigate, Tab/Enter to select
```

**Features:**
- Shows up to 8 commands at a time
- Selected command shows detailed usage
- Real-time filtering as you type
- Backspace to refine search
- Escape to cancel
- Default selection on top item
- Categorized commands (Session, Tools, Snapshots, Git, etc.)

### 🎯 Agent System

#### Specialized AI Agents
- **Framework-specific agents** - Create specialized agents for Laravel, React, Django, etc.
- **Markdown-based definitions** - Agents defined in readable .md files with YAML frontmatter
- **Two creation modes** - AI auto-generation or manual template editing
- **Dual storage scope** - Global (`~/.ollama-cli/agents/`) or project-specific (`.ollama/agents/`)
- **Enhanced keyboard navigation** - Arrow keys (↑↓) for all selections, no number entry required
- **Multi-select support** - Checkboxes with Space to toggle, Enter to confirm
- **Agent management** - Full CRUD: list, create, show, edit, delete
- **Chat integration** - Use agents with `--agent <name>` flag

**Agent Commands:**
```bash
# List all agents (global + project)
ollama-cli agent list

# Create new agent interactively
ollama-cli agent create

# Show agent details
ollama-cli agent show laravel-developer

# Edit agent definition
ollama-cli agent edit laravel-developer

# Delete agent
ollama-cli agent delete my-agent

# Use agent in chat
ollama-cli chat --agent laravel-developer
ollama-cli --agent react-expert
```

**Agent Structure:**
- **Metadata** - Name, description, framework, language, version, tags
- **Context** - Detailed domain expertise and specialization
- **Capabilities** - List of specific agent capabilities
- **Instructions** - Behavioral guidelines and best practices
- **Tools** - Available MCP tools for the agent
- **Examples** - Sample prompts users can ask
- **Constraints** - Limitations and scope boundaries

**Creation Modes:**
1. **Auto-generate** - AI creates full definition from description (uses llama3.2)
2. **Manual template** - Pre-filled template for custom editing

**Keyboard Navigation Features:**
- Arrow keys (↑↓) to navigate options
- Visual selection indicator (❯)
- Colored interface for clarity
- Space to toggle checkboxes (multi-select)
- Enter to confirm selection
- Escape to cancel (where applicable)
- TTY detection with fallback to number input
- No manual number entry required

**Example Agent Definition:**
```markdown
---
name: laravel-developer
description: Laravel development expert
framework: laravel
language: php
version: 1.0.0
tags: laravel, php, backend
---

# Laravel Developer

## Context
Specialized assistant for Laravel framework...

## Capabilities
- Create and modify Eloquent models
- Build RESTful APIs with Laravel
...
```

### 🔒 Security & Setup

#### First-Run Model Verification
- **Automatic setup check** - Verifies required models on first run
- **Model availability detection** - Checks for chat and embedding models
- **Automatic model download** - Offers to download missing models with user permission
- **Download progress tracking** - Shows percentage, size, and status in real-time
- **Storage space awareness** - Asks permission before downloading (models are 1-10 GB)
- **Guided installation** - Shows manual commands if user declines download
- **Periodic verification** - Re-checks models every 7 days
- **Setup state persistence** - Stored in `~/.ollama-cli/setup.json`
- **CLI commands**: `ollama-cli setup init|status|reset`

**Features:**
- Prevents running without required models
- User consent required for downloads (respects storage space)
- Real-time progress with formatted file sizes (MB/GB)
- Clear error messages with installation instructions
- Skip setup with `--skip-setup` flag
- Automatic Ollama connection testing
- Model compatibility verification
- Graceful fallback to manual installation

**Required Models:**
- Chat model (default: llama3.2)
- Embedding model (optional: nomic-embed-text for RAG)

**Usage:**
```bash
# First run automatically checks setup
ollama-cli

# If models missing, you'll see:
# ⚠️  Missing required models
# Would you like to download the missing models?
# Note: Models can be large (1-10 GB) and will use disk space
# Download missing models now? [Y/n]: y
#
# Downloading llama3.2...
# This may take several minutes depending on model size and network speed
#
# pulling manifest - 45% (1.2 GB / 2.7 GB)
# ✅ llama3.2 downloaded successfully!

# Check setup status
ollama-cli setup status

# Re-run setup manually
ollama-cli setup init

# Reset setup state
ollama-cli setup reset
```

### 🚀 Advanced Features

#### 📋 Workflow Automation
- **YAML-based workflows** - Define multi-step automation workflows
- **Multiple step types** - bash, test, index, git, ai, file operations
- **Variable substitution** - Use `${variable}` syntax in commands
- **Progress tracking** - Real-time feedback on workflow execution
- **Error handling** - Continue on error option for resilient workflows
- **CLI commands**: `ollama-cli workflow run|list|show`
- **Workflow storage**: `.ollama/workflows/*.yml`

**Supported Step Types:**
- `bash` - Execute shell commands
- `test` - Run test suite
- `index` - Build codebase index
- `git` - Git operations
- `ai` - AI prompts (future)
- `file` - File operations

**Usage:**
```bash
# List workflows
ollama-cli workflow list

# Run workflow
ollama-cli workflow run deploy

# Show workflow details
ollama-cli workflow show deploy
```

**Example Workflow:**
```yaml
name: Deploy Workflow
description: Build, test, and deploy application
steps:
  - name: Install dependencies
    type: bash
    command: npm install
  - name: Run tests
    type: test
  - name: Build project
    type: bash
    command: npm run build
```

#### 🗄️ Database Tools
- **SQLite support** - Execute SQL and inspect database schemas
- **Schema inspection** - View tables, columns, indexes, foreign keys
- **Query execution** - Run SELECT, INSERT, UPDATE, DELETE queries
- **Table description** - Detailed column information with constraints
- **Performance metrics** - Query execution time tracking
- **CLI commands**: `ollama-cli database query|schema|tables|describe`

**Features:**
- Automatic database connection management
- Result formatting as tables
- Foreign key relationship detection
- Index information display
- Row count statistics

**Usage:**
```bash
# Execute query
ollama-cli database query "SELECT * FROM users" --file ./app.db

# View database schema
ollama-cli database schema --file ./app.db

# List all tables
ollama-cli database tables --file ./app.db

# Describe table structure
ollama-cli database describe users --file ./app.db
```

#### 🧠 RAG System (Retrieval-Augmented Generation)
- **Vector embeddings** - Generate embeddings using Ollama's embedding models
- **Similarity search** - Find relevant documents with cosine similarity
- **Codebase indexing** - Index entire codebase for semantic search
- **Multi-format support** - Code, documentation, text
- **Configurable models** - Use any Ollama embedding model (default: nomic-embed-text)
- **CLI commands**: `ollama-cli rag add|search|index|stats|clear`
- **Storage**: `~/.ollama-cli/rag/vector-store.json`

**Features:**
- Batch embedding generation (5 concurrent)
- Cosine similarity scoring (0-1)
- Document metadata tracking
- Top-K retrieval with minimum score filtering
- Type and language filtering

**Usage:**
```bash
# Add document
ollama-cli rag add "Your documentation text" --type documentation

# Add from file
ollama-cli rag add --file README.md --type documentation

# Search for similar content
ollama-cli rag search "how to authenticate users" --topk 3

# Index entire codebase
ollama-cli rag index

# View statistics
ollama-cli rag stats
```

**Benefits:**
- Semantic code search beyond keyword matching
- Better AI context from large codebases
- Document retrieval for documentation assistance
- Foundation for advanced AI features

#### 🌐 API Testing
- **HTTP client** - Execute HTTP requests (GET, POST, PUT, PATCH, DELETE)
- **Response validation** - Validate status, headers, body, JSON paths
- **Test suites** - Run multiple API tests from JSON files
- **Detailed output** - Status, headers, body with syntax highlighting
- **Performance metrics** - Request duration tracking
- **CLI commands**: `ollama-cli api request|test`

**Validation Types:**
- Status code validation (equals, gt, lt)
- Header validation (exists, equals, contains)
- Body validation (contains, matches regex)
- JSON path validation (exists, equals)
- Schema validation (basic support)

**Usage:**
```bash
# Execute HTTP request
ollama-cli api request https://api.example.com/users

# POST request with data
ollama-cli api request https://api.example.com/users \
  --method POST \
  --header "Content-Type: application/json" \
  --data '{"name": "John Doe"}'

# Run API test suite
ollama-cli api test api-tests.json
```

**Example Test File:**
```json
[
  {
    "name": "Get Users",
    "request": {
      "url": "https://api.example.com/users",
      "method": "GET"
    },
    "validation": [
      { "type": "status", "operator": "equals", "value": 200 },
      { "type": "header", "field": "content-type", "operator": "contains", "value": "json" }
    ]
  }
]
```

### 📚 Technical Improvements
- Added YAML parsing with `yaml` library
- Implemented vector similarity search with cosine distance
- SQLite integration with `better-sqlite3`
- HTTP validation engine with multiple rule types
- Batch embedding generation for performance
- Workflow execution engine with progress callbacks

## [2.2.0] - 2026-01-01

### 🚀 High-Impact Features

#### 📊 Codebase Indexing
- **Searchable code index** - Build index of all functions, classes, interfaces, types
- **Multi-language support** - TypeScript, JavaScript, Python
- **Smart symbol extraction** - Functions, classes, interfaces, types, variables
- **Fuzzy search** - Find symbols with partial matches and scoring
- **File tracking** - Detects modifications and suggests reindexing
- **CLI commands**: `ollama-cli index build|rebuild|stats|clear`
- **REPL commands**: `/index build`, `/index stats`, `/search <symbol>`
- **Index storage**: `~/.ollama-cli/index/codebase-index.json`

**Benefits:**
- Faster symbol lookup without grepping entire codebase
- Better context for AI (knows what functions/classes exist)
- Foundation for RAG and semantic search
- Automatic reindexing when files change

**Usage:**
```bash
# Build index
ollama-cli index build

# Search for symbol
ollama-cli chat
> /search handleCommand
```

#### 🧪 Test Integration
- **Auto-detect test framework** - Vitest, Jest, Mocha, Pytest, npm test
- **Run tests from REPL** - `/test` command runs full test suite
- **AI failure analysis** - Automatically analyzes and explains test failures
- **Detailed results** - Shows passed/failed/skipped counts with duration
- **Smart output parsing** - Extracts test names, errors, stack traces
- **Multiple failures** - Shows up to 5 failures with context

**Supported Frameworks:**
- JavaScript/TypeScript: Vitest, Jest, Mocha
- Python: Pytest
- Generic: npm test

**Usage:**
```bash
# In chat with tools enabled
ollama-cli chat --tools
> /test

# AI automatically analyzes any failures and suggests fixes
```

**Benefits:**
- TDD workflow integrated into AI chat
- Instant feedback on code changes
- AI explains cryptic test errors
- Reduces context switching

### 📚 Technical Improvements
- Added regex-based code parser for symbol extraction
- File modification tracking with mtimeMs comparison
- Test output parsers for multiple frameworks
- Fuzzy matching algorithm for symbol search
- Index versioning and format migration support

## [2.1.0] - 2026-01-01

### ⚡ Quick-Win Features

#### 🎮 Code Execution
- **New tool: `execute_code`** - Run code snippets directly in chat
- **Multi-language support**: Python, JavaScript, TypeScript, Shell
- **Safe execution** with timeout protection (30s default)
- **Output capture** - stdout, stderr, and execution time
- **Dangerous tool** - Requires user confirmation

**Usage:**
```javascript
// AI can now execute code to verify solutions
execute_code({
  language: "python",
  code: "print('Hello, World!')"
})
```

#### 🔄 Model Comparison
- **New command: `ollama-cli compare`** - Side-by-side model comparison
- **Parallel execution** - Tests multiple models simultaneously
- **Detailed metrics** - Response time, length, quality comparison
- **Performance summary** - Average time, fastest model, longest response
- **Syntax highlighting** in comparison output

**Usage:**
```bash
ollama-cli compare "Explain async/await" --models llama3.1,mistral,codellama
```

#### 🔗 Pipe Mode for Ask Command
- **stdin support** - Pipe command output directly to AI
- **Automatic detection** - Detects when stdin is not a TTY
- **Context preservation** - Prepends piped data to your prompt

**Usage:**
```bash
git diff | ollama-cli ask "review these changes"
cat error.log | ollama-cli ask "what's causing this error?"
npm test 2>&1 | ollama-cli ask "explain these test failures"
```

#### 🎨 Syntax Highlighting
- **Automatic code block detection** in markdown responses
- **Multi-language support** - JavaScript, TypeScript, Python, Shell, Bash
- **Smart highlighting**:
  - Keywords in magenta
  - Strings in green
  - Numbers in yellow
  - Function calls in cyan
  - Comments dimmed
- **Code block borders** with language labels
- **Applied in**: Model comparison, future REPL enhancements

#### ⌨️ Keyboard Shortcuts
- **Ctrl+K / Ctrl+L** - Clear screen (keeps history)
- **Ctrl+U** - Clear current line
- **Ctrl+D** - Exit (native readline)
- **Ctrl+R** - Reverse search history (native readline)
- **TTY-aware** - Only activates in interactive terminals

### 📚 Technical Improvements
- Added syntax highlighting utility (`src/ui/syntax.ts`)
- Enhanced ask command with stdin reading capability
- Improved code execution with temp file handling for TypeScript
- Better error handling across all new features
- Keypress event handling for custom shortcuts

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
