# Quick Start Guide

Get up and running with Ollama CLI in under 5 minutes.

## Prerequisites

1. **Node.js 20+**
   ```bash
   node --version  # Should be 20.0.0 or higher
   ```

2. **Ollama installed and running**
   ```bash
   # Install Ollama (if not already installed)
   # Visit: https://ollama.ai

   # Start Ollama server
   ollama serve

   # Pull a model (in another terminal)
   ollama pull llama2
   ```

## Installation

### From Source (Development)

```bash
# Clone the repository
git clone <repository-url>
cd ollama-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for testing
npm link

# Now you can use it
ollama-cli --help
```

### From NPM (Once Published)

```bash
npm install -g ollama-cli
```

## First Steps

### 1. Check Connection

Verify Ollama is running:

```bash
ollama-cli models
```

You should see a table of available models.

### 2. Ask a Question

Try a quick one-shot question:

```bash
ollama-cli ask "What is the capital of France?"
```

### 3. Start a Chat

Enter interactive mode:

```bash
ollama-cli chat
```

Type your messages and press Enter. Use `/help` to see available commands.

### 4. Generate JSON

Create a schema file:

```bash
cat > colors.json << 'EOF'
{
  "type": "object",
  "properties": {
    "colors": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}
EOF
```

Generate structured JSON:

```bash
ollama-cli ask "List 5 colors" --json colors.json
```

### 5. Configure Settings

Set your preferred model:

```bash
ollama-cli config set defaultModel mistral
ollama-cli config list
```

## Common Workflows

### Quick Answers

```bash
# Get a quick answer
ollama-cli ask "Explain quantum computing in one sentence"

# Use a specific model
ollama-cli ask "Write a haiku about code" -m llama2

# Use a system prompt
ollama-cli ask "What is 2+2?" --system "You are a math teacher"
```

### Interactive Chat

```bash
# Start chat
ollama-cli chat

# Inside chat:
> Hello! Tell me about TypeScript.
[AI responds...]

> /save typescript-discussion
Session saved as: typescript-discussion

> /exit
```

### Session Management

```bash
# Start a named session
ollama-cli chat -s my-project

# Later, resume the session
ollama-cli chat -s my-project
```

### Model Management

```bash
# List available models
ollama-cli models

# Use a different model
ollama-cli chat -m codellama

# Or set as default
ollama-cli config set defaultModel codellama
```

### JSON Generation

```bash
# Create a task schema
cat > task.json << 'EOF'
{
  "type": "object",
  "properties": {
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "priority": {"type": "string", "enum": ["low", "medium", "high"]},
          "completed": {"type": "boolean"}
        }
      }
    }
  }
}
EOF

# Generate structured data
ollama-cli ask "Create 3 tasks for a web project" --json task.json
```

## Tips & Tricks

### 1. Use Environment Variables

```bash
# Set custom Ollama URL
export OLLAMA_BASE_URL=http://192.168.1.100:11434/api

# Set default model
export OLLAMA_MODEL=mistral

# Enable debug mode
export OLLAMA_CLI_DEBUG=1
```

### 2. Pipe Output

```bash
# Save response to file
ollama-cli ask "Write a poem about coding" > poem.txt

# Use in scripts
RESPONSE=$(ollama-cli ask "What is AI?" --raw)
echo "AI is: $RESPONSE"
```

### 3. Debug Connection Issues

```bash
# Enable debug logging
OLLAMA_CLI_DEBUG=1 ollama-cli ask "Hello"

# Check Ollama is running
curl http://localhost:11434/api/tags

# Verify model exists
ollama list
```

### 4. Chat Commands Reference

Inside `ollama-cli chat`:

- `/help` - Show help
- `/models` - List models
- `/clear` - Clear history
- `/save [name]` - Save session
- `/load <id>` - Load session
- `/exit` - Exit

## Troubleshooting

### "Cannot connect to Ollama"

**Solution**: Start Ollama server
```bash
ollama serve
```

### "Model not found"

**Solution**: Pull the model
```bash
ollama pull llama2
```

### "Command not found: ollama-cli"

**Solution**: Make sure it's installed and in PATH
```bash
npm install -g ollama-cli
# OR for development
npm link
```

### Slow Responses

**Solution**: Use a smaller model
```bash
ollama pull tinyllama
ollama-cli config set defaultModel tinyllama
```

## Next Steps

- Read the [full README](README.md) for detailed documentation
- Check [API.md](docs/API.md) for programmatic usage
- See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
- Review [examples/](examples/) for more usage patterns

## Development

```bash
# Run tests
npm test

# Watch mode (auto-rebuild)
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Getting Help

- Check the documentation in `docs/`
- Review examples in `examples/`
- Open an issue on GitHub
- Read the [Ollama documentation](https://github.com/ollama/ollama)

Happy coding!
