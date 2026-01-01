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

### 🎯 Planning System (NEW!)
- **Smart Detection**: Auto-detect complex tasks requiring planning
- **Implementation Plans**: Break down tasks into actionable steps
- **Step-by-Step Execution**: Track progress through plan stages
- **Plan Storage**: Save plans in JSON + Markdown formats
- **Progress Tracking**: Monitor completion status and step results
- **Auto-Planning**: Enabled by default for complex requests

## Installation

```bash
npm install -g ollama-cli
```

## Prerequisites

- Node.js 20 or higher
- [Ollama](https://ollama.ai) installed and running locally

## Quick Start

```bash
# Start Ollama server (if not already running)
ollama serve

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

### `ask`

Get a one-shot response without starting an interactive session.

```bash
ollama-cli ask <prompt> [options]

Options:
  -m, --model <model>     Model to use
  --json <schema>         Generate JSON matching the schema file
  --raw                   Output raw response without formatting
  --system <message>      Set system prompt
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
