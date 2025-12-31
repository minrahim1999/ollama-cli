# Get Started - First Steps

This file contains the exact commands to get your Ollama CLI up and running.

## Step 1: Install Dependencies

```bash
cd /Users/muhaimin/Documents/01-Projects/LLM-cli
npm install
```

This will install:
- TypeScript and build tools
- Commander.js for CLI parsing
- Chalk, Ora, cli-table3 for UI
- Vitest for testing
- ESLint and Prettier for code quality

## Step 2: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

## Step 3: Link Globally (Development)

```bash
npm link
```

This makes `ollama-cli` available as a global command.

## Step 4: Verify Installation

```bash
ollama-cli --help
```

You should see the help menu with all available commands.

## Step 5: Make Sure Ollama is Running

```bash
# In another terminal window
ollama serve
```

If you don't have Ollama installed, visit: https://ollama.ai

## Step 6: Pull a Model

```bash
ollama pull llama2
```

## Step 7: Test the CLI

### List Models
```bash
ollama-cli models
```

### Ask a Question
```bash
ollama-cli ask "What is TypeScript?"
```

### Start Interactive Chat
```bash
ollama-cli chat
```

Inside chat, try:
- Type: `Hello! Tell me about yourself.`
- Type: `/help` to see commands
- Type: `/save my-first-chat` to save the session
- Type: `/exit` to quit

## Next Steps

### Configure Default Settings

```bash
# Set your preferred model
ollama-cli config set defaultModel llama2

# View all settings
ollama-cli config list
```

### Try JSON Generation

```bash
# Use the included example schema
ollama-cli ask "List 5 programming languages with their types" \
  --json examples/schema-example.json
```

### Run Tests

```bash
npm test
```

### Development Mode (Watch)

```bash
npm run dev
```

This will watch for file changes and rebuild automatically.

## Project Structure Overview

```
Your Project Location:
/Users/muhaimin/Documents/01-Projects/LLM-cli

Key Folders:
- src/          Source code (TypeScript)
- dist/         Compiled code (generated)
- docs/         Documentation
- examples/     Usage examples

Configuration:
~/.ollama-cli/config.json    User settings
~/.ollama-cli/sessions/      Saved conversations
```

## Available Commands Summary

```bash
# Chat
ollama-cli chat                              # Start interactive chat
ollama-cli chat -m mistral                   # Use specific model
ollama-cli chat -s <session-id>              # Resume session

# Ask
ollama-cli ask "prompt"                      # Quick question
ollama-cli ask "prompt" -m llama2            # With specific model
ollama-cli ask "prompt" --json schema.json   # Generate JSON
ollama-cli ask "prompt" --raw                # Raw output

# Models
ollama-cli models                            # List all models

# Config
ollama-cli config list                       # Show all config
ollama-cli config set <key> <value>          # Set config value
ollama-cli config get <key>                  # Get config value
ollama-cli config reset                      # Reset to defaults
```

## Development Commands

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm test             # Run tests
npm run lint         # Check code quality
npm run format       # Format code
npm run clean        # Remove dist/
```

## Troubleshooting

### Command not found

```bash
# Make sure you ran npm link
npm link

# Or use the direct path
node dist/cli.js --help
```

### Cannot connect to Ollama

```bash
# Make sure Ollama is running
ollama serve

# Test Ollama directly
curl http://localhost:11434/api/tags
```

### TypeScript errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Test failures

```bash
# Run tests with verbose output
npm test -- --reporter=verbose
```

## Useful Documentation

- **README.md** - Full user guide
- **QUICKSTART.md** - 5-minute tutorial
- **DEVELOPMENT.md** - Development guide
- **docs/API.md** - API reference
- **docs/ARCHITECTURE.md** - Technical details
- **PROJECT_SUMMARY.md** - Complete overview

## Example Workflow

```bash
# 1. Start development mode
npm run dev

# 2. In another terminal, test your changes
ollama-cli chat

# 3. Make changes to src/commands/chat.ts

# 4. Test again (auto-rebuilt)
ollama-cli chat

# 5. Run tests
npm test

# 6. Format code before committing
npm run format
npm run lint
```

## Publishing (When Ready)

```bash
# 1. Make sure everything works
npm run build
npm test

# 2. Test the package locally
npm pack
npm install -g ./ollama-cli-1.0.0.tgz

# 3. Test the installed package
ollama-cli --help

# 4. Publish to npm
npm publish
```

## Getting Help

If you run into issues:

1. Check the documentation in `docs/`
2. Look at examples in `examples/`
3. Read the error message carefully
4. Enable debug mode: `OLLAMA_CLI_DEBUG=1 ollama-cli chat`
5. Check Ollama logs

## What's Next?

- Read the full documentation
- Try different models
- Experiment with JSON schemas
- Create custom sessions
- Contribute improvements

Happy coding!
