# Ollama CLI

A professional, feature-rich command-line interface for Ollama - chat with AI models, manage templates, plan implementations, and streamline your local LLM workflow from the terminal.

## ✨ Features

### 🎨 Modern UI
- **Gradient-powered interface** with cyan → blue theme
- **Clean typography** with 2-column dashboard layout
- **Smart message display** with minimal borders and better spacing
- **Visual hierarchy** using semantic colors
- **Tool execution feedback** with condensed output and status icons

### 💬 Core Features
- **Interactive Chat**: Start conversations with AI models in a beautiful REPL interface
- **One-shot Generation**: Quick responses with the `ask` command
- **JSON Mode**: Generate structured JSON with schema validation
- **Session Management**: Save and resume conversations
- **Model Management**: List and switch between installed models
- **Configuration**: Persistent settings for base URL, default model, and more
- **Streaming Responses**: See AI responses as they're generated in real-time
- **Offline Detection**: Helpful error messages when Ollama isn't running

### 🛠️ Advanced Features
- **Tools/MCP System**: Let AI read/write files, execute commands, and interact with your file system
- **Memory/Snapshots**: Automatic change tracking with rollback capability
- **25+ Built-in Tools**: File operations, git integration, code analysis, and more
- **Safety Guards**: Sandboxing, user confirmation for dangerous operations, automatic snapshots
- **Diff Viewing**: See exactly what changed between versions
- **Session Snapshots**: Link file changes to chat conversations

### 📋 Template Library (NEW!)
- **5 Built-in Templates**: Code Review, Documentation, Bug Fix, Refactor, Test Generation
- **Custom Templates**: Create reusable prompts with variable substitution
- **Template Categories**: Organize by code, documentation, git, or general
- **Variable Support**: Use `{{variable}}` placeholders for dynamic content
- **REPL Integration**: Quick access with `/template` command

### 💾 Export/Import (NEW!)
- **Multiple Formats**: Export to JSON, Markdown, or plain text
- **Import Support**: Import conversations from JSON or Markdown
- **Metadata Preservation**: Keep session details, model info, and timestamps
- **Shareable Conversations**: Easy collaboration and documentation

### 🔀 Git Workflow (NEW!)
- **AI Commit Messages**: Generate conventional or simple commit messages
- **PR Summaries**: Auto-generate pull request descriptions
- **Code Review**: Get AI feedback on staged changes
- **Git Integration**: Seamless workflow with git commands
- **Conventional Commits**: Support for standardized commit formats

### 🎯 Planning System
- **Smart Detection**: Auto-detect complex tasks requiring planning
- **Implementation Plans**: Break down tasks into actionable steps
- **Step-by-Step Execution**: Track progress through plan stages
- **Plan Storage**: Save plans in JSON + Markdown formats
- **Progress Tracking**: Monitor completion status and step results
- **Auto-Planning**: Enabled by default for complex requests

### ⚡ Quick-Win Features
- **Interactive Command Autocomplete**: Type "/" to see all REPL commands with real-time filtering (NEW!)
- **Code Execution**: Run Python, JavaScript, TypeScript, and Shell code snippets directly in chat
- **Model Comparison**: Compare responses from multiple models side-by-side with performance metrics
- **Pipe Mode**: Pipe command output directly to ask command (`git diff | ollama-cli ask "review"`)
- **Syntax Highlighting**: Automatic code block highlighting with language-specific colors
- **Keyboard Shortcuts**: Ctrl+K/L (clear screen), Ctrl+U (clear line), "/" for command help

### 🚀 High-Impact Features
- **Codebase Indexing**: Build searchable index of all functions, classes, and symbols with fuzzy search
- **Test Integration**: Run tests with automatic AI analysis of failures (Vitest, Jest, Mocha, Pytest)

### 🎯 Advanced Features (NEW!)
- **Workflow Automation**: Define and execute YAML-based multi-step workflows
- **Database Tools**: Execute SQL queries and inspect SQLite database schemas
- **RAG System**: Vector embeddings for semantic search and context retrieval
- **API Testing**: HTTP client with response validation and test suites

### 🎯 Agent System (NEW!)
- **Framework-Specific Agents**: Create specialized AI agents for Laravel, React, Django, etc.
- **Markdown Definitions**: Agent configurations stored in readable .md files
- **AI Auto-Generation**: Let AI create full agent definitions from descriptions
- **Manual Templates**: Edit pre-filled templates for custom agents
- **Dual Storage**: Global (`~/.ollama-cli/agents/`) or project-specific (`.ollama/agents/`)
- **Enhanced Navigation**: Arrow keys (↑↓) for all selections - no number entry needed
- **Full Management**: List, create, show, edit, and delete agents
- **Chat Integration**: Use agents with `ollama-cli chat --agent <name>`

**Example: Create a Laravel Developer Agent**
```bash
# Interactive creation with AI auto-generation
ollama-cli agent create
# Agent name: laravel-developer
# Description: Laravel development expert
# Framework: laravel
# Language: php
# → Auto-generate using AI (arrow keys to select)
# → Global (available in all projects)

# Use the agent
ollama-cli chat --agent laravel-developer
ollama-cli --agent laravel-developer
```

**Keyboard Navigation:**
- Use **↑↓** arrow keys to navigate
- **Space** to toggle checkboxes
- **Enter** to confirm
- **Escape** to cancel
- No manual number entry required!

## Installation

```bash
npm install -g ollama-cli
```

## Prerequisites

- Node.js 20 or higher
- [Ollama](https://ollama.ai) installed and running locally

## First Run Setup

On first run, ollama-cli will automatically verify that required models are installed:

```bash
# Start Ollama server (if not already running)
ollama serve

# Run ollama-cli - it will guide you through setup
ollama-cli
```

**The setup will check for:**
- ✅ Ollama connection
- ✅ Required chat model (default: llama3.2)
- ⚠️ Embedding model for RAG (optional: nomic-embed-text)

**If models are missing, ollama-cli can automatically download them:**
- You'll be asked for permission before downloading (models can be 1-10 GB)
- Download progress is shown with percentage and file size
- You can decline and install manually with `ollama pull llama3.2`

**Manual setup commands:**
```bash
ollama-cli setup init    # Re-run setup
ollama-cli setup status  # Check setup status
ollama-cli setup reset   # Reset setup state
```

## Quick Start

```bash
# Start an interactive chat session
ollama-cli chat

# Start chat with AI coding tools enabled
ollama-cli chat --tools

# Ask a quick question
ollama-cli ask "What is the capital of France?"

# Generate JSON with schema validation
ollama-cli ask "List 3 colors" --json schema.json

# List available models
ollama-cli models

# Configure settings
ollama-cli config set defaultModel llama2
```

## Commands

### `chat`

Start an interactive chat session with an AI model.

```bash
ollama-cli chat [options]

Options:
  -m, --model <model>       Model to use (default: from config)
  -s, --session <id>        Resume a specific session
  --system <message>        Set system prompt
  --tools                   Enable MCP tools (AI can read/write files, run commands)
  --working-dir <path>      Working directory for tools (default: current)
```

**REPL Commands:**

*Session Management:*
- `/help` - Show available commands
- `/new` - Start new conversation
- `/clear` - Clear conversation history
- `/save [name]` - Save current session
- `/load <id>` - Load a previous session
- `/exit` - Exit the chat

*Tools & Operations (when --tools enabled):*
- `/tools` - List available tools
- `/stats` - Show tool usage statistics
- `/snapshots` - View snapshot history
- `/diff <id>` - Show snapshot differences
- `/revert <id>` - Revert to a snapshot
- `/undo` - Undo last change
- `/cleanup` - Clean old snapshots

*Templates & Export:*
- `/template <name> [key=value...]` - Use prompt template
- `/export [format] [filename]` - Export conversation (json/markdown/txt)

*Planning:*
- `/plan <task>` - Create implementation plan
- `/plans` - List all plans

*Git Workflow:*
- `/commit [style]` - Generate git commit message (conventional/simple)
- `/review` - Review staged changes

*Other:*
- `/models` - List available models

**💡 Interactive Command Autocomplete:**

Type `/` to trigger smart autocomplete with real-time filtering:

```bash
# In chat, type "/"
You: /

# Shows all commands with navigation
Commands (use ↑↓ to navigate, Tab/Enter to select, Esc to cancel):
❯ /help - Show help
  /new - Start new conversation
  /tools - List all tools
  /export - Export conversation
    /export [format] [filename]
  ... and 20 more

# Filter by typing more
You: /exp

Commands:
❯ /export - Export conversation
    /export [format] [filename]

# Use ↑↓ to navigate, Tab/Enter to select
```

**Features:**
- Real-time filtering as you type
- Shows command descriptions and usage
- Keyboard navigation with arrow keys
- Default selection on top match
- Escape to cancel
- Backspace to refine search

**Keyboard Shortcuts:**
- `Ctrl+K` or `Ctrl+L` - Clear screen (keeps conversation history)
- `Ctrl+U` - Clear current line
- `Ctrl+D` - Exit chat session
- `Ctrl+R` - Reverse search command history
- `Ctrl+C` - Cancel current input

### `ask`

Get a one-shot response without starting an interactive session. Supports piping input from stdin.

```bash
ollama-cli ask <prompt> [options]

Options:
  -m, --model <model>     Model to use
  --json <schema>         Generate JSON matching the schema file
  --raw                   Output raw response without formatting
  --system <message>      Set system prompt
```

**Pipe Mode Examples:**
```bash
# Review git changes
git diff | ollama-cli ask "review these changes"

# Analyze error logs
cat error.log | ollama-cli ask "what's causing this error?"

# Explain test failures
npm test 2>&1 | ollama-cli ask "explain these failures"

# Debug command output
docker logs myapp | ollama-cli ask "find errors"
```

### `compare`

Compare responses from multiple models side-by-side.

```bash
ollama-cli compare <prompt> [options]

Options:
  --models <models>       Comma-separated list of models
  --system <message>      Set system prompt
```

**Examples:**
```bash
# Compare 3 models
ollama-cli compare "Explain async/await" --models llama3.1,mistral,codellama

# Use default models (configured + llama3.1 + mistral)
ollama-cli compare "What is recursion?"

# With system prompt
ollama-cli compare "Optimize this code" --system "You are an expert developer"
```

### `models`

List all available Ollama models.

```bash
ollama-cli models
```

### `config`

Manage CLI configuration.

```bash
ollama-cli config <command> [key] [value]

Commands:
  set <key> <value>   Set a configuration value
  get <key>           Get a configuration value
  list                List all configuration
  reset               Reset to defaults

Keys:
  baseUrl             Ollama API base URL (default: http://localhost:11434/api)
  defaultModel        Default model to use (default: llama2)
  timeoutMs           Request timeout in milliseconds (default: 30000)
  autoPlan            Enable automatic planning for complex tasks (default: true)
```

### `template`

Manage prompt templates with variable substitution.

```bash
ollama-cli template <command> [args...]

Commands:
  list                List all templates
  show <name>         Show template details
  create              Create new template (interactive)
  use <name>          Use template with variables
  edit <name>         Edit template
  delete <name>       Delete template

Options:
  -c, --category      Filter by category (code|documentation|git|general)
```

**Examples:**
```bash
# List all templates
ollama-cli template list

# Use code review template
ollama-cli template use code-review filename=app.ts language=typescript

# Create custom template
ollama-cli template create
```

### `export`

Export conversation to file.

```bash
ollama-cli export <session-id> [options]

Options:
  -f, --format <format>   Export format (json|markdown|txt) (default: markdown)
  -o, --output <path>     Output file path
  --pretty                Pretty print JSON
```

**Examples:**
```bash
# Export to markdown
ollama-cli export abc12345

# Export to JSON with pretty printing
ollama-cli export abc12345 --format json --pretty

# Export to specific file
ollama-cli export abc12345 -o my-conversation.md
```

### `import`

Import conversation from file.

```bash
ollama-cli import <file> [options]

Options:
  -n, --name <name>      Session name
  -f, --format <format>  File format (json|markdown) (auto-detected)
```

**Examples:**
```bash
# Import from JSON
ollama-cli import conversation.json

# Import with custom name
ollama-cli import chat.md --name "Imported Discussion"
```

### `git`

Git workflow helpers with AI assistance.

```bash
ollama-cli git <command> [options]

Commands:
  commit-msg          Generate commit message from staged changes
  pr-summary          Generate PR description from branch diff
  review              Review staged changes

Options:
  -m, --model <model>           Model to use
  --style <style>               Commit style (conventional|simple) (default: conventional)
  --auto-commit                 Auto-commit after generating message
  --base <branch>               Base branch for PR (default: main)
```

**Examples:**
```bash
# Generate conventional commit message
ollama-cli git commit-msg

# Generate simple commit message and auto-commit
ollama-cli git commit-msg --style simple --auto-commit

# Generate PR summary
ollama-cli git pr-summary --base develop

# Review staged changes
ollama-cli git review
```

### `plan`

Manage implementation plans.

```bash
ollama-cli plan <command> [args...]

Commands:
  list                List all plans
  show <plan-id>      Show plan details
  delete <plan-id>    Delete a plan
```

**Examples:**
```bash
# List all plans
ollama-cli plan list

# Show plan details
ollama-cli plan show abc12345

# Delete a plan
ollama-cli plan delete abc12345
```

### `index`

Build and manage codebase index for better symbol search and context.

```bash
ollama-cli index <command> [args...]

Commands:
  build               Build index (only if needed)
  rebuild             Force rebuild index
  stats               Show index statistics
  clear               Clear index
```

**Examples:**
```bash
# Build index for current project
ollama-cli index build

# Force rebuild
ollama-cli index rebuild

# View statistics
ollama-cli index stats

# In REPL
/index build
/search handleCommand
/search MyClass --type class
```

**Index Features:**
- Indexes TypeScript, JavaScript, Python files
- Extracts functions, classes, interfaces, types, variables
- Fuzzy search with relevance scoring
- Auto-detects file modifications
- Stores at `~/.ollama-cli/index/codebase-index.json`

### `workflow`

Manage and execute YAML-based automation workflows.

```bash
ollama-cli workflow <command> [args...]

Commands:
  run <name>              Run a workflow
  list                    List available workflows
  show <name>             Show workflow details
```

**Examples:**
```bash
# List workflows
ollama-cli workflow list

# Run deployment workflow
ollama-cli workflow run deploy

# Show workflow steps
ollama-cli workflow show deploy
```

**Example Workflow (`.ollama/workflows/deploy.yml`):**
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
  - name: Deploy
    type: bash
    command: npm run deploy
```

### `database`

Execute SQL queries and inspect database schemas (SQLite).

```bash
ollama-cli database <command> [args...]

Commands:
  query <sql>             Execute SQL query
  schema                  Show database schema
  tables                  List all tables
  describe <table>        Describe table structure

Options:
  --file <path>           Database file path (default: ./database.db)
  --table <name>          Table name for describe command
```

**Examples:**
```bash
# Execute query
ollama-cli database query "SELECT * FROM users LIMIT 10" --file ./app.db

# View schema
ollama-cli database schema --file ./app.db

# List tables
ollama-cli database tables --file ./app.db

# Describe table
ollama-cli database describe users --file ./app.db
```

### `rag`

Vector embeddings and semantic search with RAG (Retrieval-Augmented Generation).

```bash
ollama-cli rag <command> [args...]

Commands:
  add <text>              Add document to vector store
  search <query>          Search for similar documents
  index                   Index entire codebase for RAG
  stats                   Show vector store statistics
  clear                   Clear vector store

Options:
  --file <path>           File to add (for add command)
  --type <type>           Document type (code|documentation|text)
  --language <lang>       Programming language
  --model <model>         Embedding model (default: nomic-embed-text)
  --topk <n>              Number of results (default: 5)
  --min-score <n>         Minimum similarity score (default: 0.5)
```

**Examples:**
```bash
# Add documentation
ollama-cli rag add "User authentication guide..." --type documentation

# Add from file
ollama-cli rag add --file README.md --type documentation

# Search
ollama-cli rag search "how to authenticate users" --topk 3

# Index codebase
ollama-cli rag index

# View stats
ollama-cli rag stats
```

**Benefits:**
- Semantic search beyond keyword matching
- Better AI context from large codebases
- Document retrieval for assistance
- Uses Ollama's embedding models (nomic-embed-text)

### `setup`

Manage first-run setup and model verification.

```bash
ollama-cli setup <command>

Commands:
  init                    Run first-time setup
  status                  Show setup status
  reset                   Reset setup state
```

**Examples:**
```bash
# Check setup status
ollama-cli setup status

# Re-run setup
ollama-cli setup init

# Reset and start fresh
ollama-cli setup reset
```

**Security Features:**
- Automatic model verification on first run
- Optional automatic model download with user permission
- Download progress tracking with size and percentage
- Periodic model availability checks (every 7 days)
- Prevents running without required models
- Clear error messages with installation instructions
- Respects user storage space with explicit consent

### `api`

HTTP client and API testing with validation.

```bash
ollama-cli api <command> [args...]

Commands:
  request <url>           Execute HTTP request
  test <file>             Run API test suite

Options:
  --method <method>       HTTP method (GET|POST|PUT|PATCH|DELETE)
  --header <header>       HTTP header (can be used multiple times)
  --data <data>           Request body (JSON or raw)
  --file <path>           Test file path (for test command)
  --timeout <ms>          Request timeout in milliseconds
```

**Examples:**
```bash
# GET request
ollama-cli api request https://api.example.com/users

# POST request
ollama-cli api request https://api.example.com/users \
  --method POST \
  --header "Content-Type: application/json" \
  --data '{"name": "John Doe", "email": "john@example.com"}'

# Run test suite
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
  },
  {
    "name": "Create User",
    "request": {
      "url": "https://api.example.com/users",
      "method": "POST",
      "headers": { "Content-Type": "application/json" },
      "body": { "name": "Test User" }
    },
    "validation": [
      { "type": "status", "operator": "equals", "value": 201 },
      { "type": "json-path", "field": "id", "operator": "exists" }
    ]
  }
]
```

## Configuration

Configuration is stored in `~/.ollama-cli/config.json`.

**Priority order:**
1. CLI flags (highest priority)
2. Environment variables
3. Config file
4. Hardcoded defaults (lowest priority)

**Environment Variables:**
- `OLLAMA_BASE_URL` - Override base URL
- `OLLAMA_MODEL` - Override default model
- `OLLAMA_CLI_DEBUG` - Enable debug logging

## Session Management

Sessions are automatically saved in `~/.ollama-cli/sessions/`.

Each session contains:
- Unique ID
- Model used
- Complete message history
- Creation and update timestamps

## Tools & Memory System

### MCP Tools

Enable tools to let the AI interact with your file system:

```bash
ollama-cli chat --tools
```

**Available Tools:**
- `read_file` - Read files with line numbers
- `write_file` - Create/update files (auto-snapshot)
- `edit_file` - Precise string replacements (auto-snapshot)
- `list_directory` - Browse folders
- `search_files` - Grep-like file search
- `bash` - Execute shell commands (requires confirmation)
- `execute_code` - Run Python, JavaScript, TypeScript, or Shell code (requires confirmation)
- `copy_file`, `move_file`, `delete_file` - File operations
- `create_directory` - Create directories

**Safety Features:**
- Sandboxed to working directory
- User confirmation for dangerous operations
- Automatic snapshots before file modifications
- Blocked critical system paths

See [docs/TOOLS.md](docs/TOOLS.md) for complete documentation.

### Memory & Snapshots

The CLI automatically tracks file changes and creates snapshots:

```bash
# View snapshot history
/snapshots

# See what changed
/diff <snapshot-id>

# Revert to previous state
/revert <snapshot-id>

# Clean old snapshots
/cleanup
```

**Snapshots are automatically created:**
- Before writing files
- Before editing files
- Before moving/copying/deleting files

**Storage:** `~/.ollama-cli/snapshots/`

See [docs/MEMORY.md](docs/MEMORY.md) for complete documentation.

## Examples

### Interactive Chat
```bash
ollama-cli chat -m llama2
> Hello! How are you?
I'm doing well, thank you for asking! How can I help you today?
> /save my-first-chat
Session saved as: my-first-chat
```

### JSON Generation
```bash
# Create a schema file
cat > colors-schema.json << EOF
{
  "type": "object",
  "properties": {
    "colors": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
EOF

# Generate JSON
ollama-cli ask "List 5 primary and secondary colors" --json colors-schema.json
```

### Configuration
```bash
# Set default model
ollama-cli config set defaultModel mistral

# Set custom Ollama URL
ollama-cli config set baseUrl http://192.168.1.100:11434/api

# View all settings
ollama-cli config list
```

## Development

```bash
# Clone the repository
git clone <repository-url>
cd ollama-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### "Cannot connect to Ollama"
Make sure Ollama is running:
```bash
ollama serve
```

### "Model not found"
List available models and pull the one you need:
```bash
ollama list
ollama pull llama2
```

### Debug Mode
Enable debug logging:
```bash
OLLAMA_CLI_DEBUG=1 ollama-cli chat
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Links

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Report Issues](https://github.com/your-repo/ollama-cli/issues)
