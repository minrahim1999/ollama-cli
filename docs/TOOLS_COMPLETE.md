# Tools System (MCP - Model Context Protocol)

The Ollama CLI implements a comprehensive tools system that allows LLMs to interact with the file system, execute commands, and perform various operations, similar to Claude Code.

## Overview

The tools system enables the AI to:
- Read and write files
- Edit files with precise string replacements
- List directories and search for files
- Execute bash commands
- Perform file operations (copy, move, delete)
- Create directories

All tool operations are:
- Tracked with snapshots for rollback capability
- Protected by safety checks
- Subject to user confirmation for dangerous operations

## Enabling Tools

Start chat with tools enabled:

```bash
ollama-cli chat --tools
```

Set a specific working directory:

```bash
ollama-cli chat --tools --working-dir /path/to/project
```

## Available Tools

### 1. read_file
Read file contents with line numbers

### 2. write_file
Create or overwrite files (creates snapshot)

### 3. edit_file
Precise string replacement edits (creates snapshot)

### 4. list_directory
Browse folders recursively

### 5. search_files
Search for patterns with grep-like functionality

### 6. bash
Execute shell commands (requires confirmation)

### 7. copy_file, move_file, delete_file
File operations (create snapshots)

### 8. create_directory
Create directories with parents

## Chat Commands

When in tools-enabled chat:

- `/tools` - List all available tools
- `/stats` - Show tool usage statistics
- `/snapshots` - View snapshot history
- `/diff <id>` - Show snapshot differences
- `/revert <id>` - Revert to snapshot
- `/cleanup` - Clean old snapshots

## Safety Features

1. **Sandboxing**: Operations limited to working directory
2. **User Confirmation**: Dangerous operations require approval
3. **Blocked Paths**: System critical paths protected
4. **Snapshots**: Automatic before file modifications
5. **Command Filtering**: Dangerous bash commands blocked

## Example Session

```
$ ollama-cli chat --tools

You: Can you list the files in the src directory?