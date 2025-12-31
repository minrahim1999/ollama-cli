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

Read file contents with optional line range.

**Parameters:**
- `file_path` (required): Path to the file
- `offset` (optional): Starting line number (1-based)
- `limit` (optional): Number of lines to read

**Example:**
```json
{
  "tool": "read_file",
  "parameters": {
    "file_path": "src/index.ts",
    "offset": 10,
    "limit": 20
  }
}
```

**Output:**
Returns file content with line numbers.

### 2. write_file

Create or overwrite a file.

**Parameters:**
- `file_path` (required): Path to the file
- `content` (required): Content to write

**Example:**
```json
{
  "tool": "write_file",
  "parameters": {
    "file_path": "src/new-file.ts",
    "content": "export const hello = 'world';"
  }
}
```

**Safety:**
- Creates snapshot before writing
- Creates parent directories automatically

### 3. edit_file

Make precise edits using string replacement.

**Parameters:**
- `file_path` (required): Path to the file
- `old_string` (required): Exact string to replace
- `new_string` (required): Replacement string

**Example:**
```json
{
  "tool": "edit_file",
  "parameters": {
    "file_path": "src/config.ts",
    "old_string": "const PORT = 3000;",
    "new_string": "const PORT = 8080;"
  }
}
```

**Safety:**
- Creates snapshot before editing
- Ensures `old_string` exists exactly once
- Fails if string not found or ambiguous

### 4. list_directory

List files and directories.

**Parameters:**
- `path` (optional): Path to list (default: current directory)
- `recursive` (optional): List recursively (default: false)

**Example:**
```json
{
  "tool": "list_directory",
  "parameters": {
    "path": "src",
    "recursive": true
  }
}
```

**Output:**
Returns sorted list of files and directories (directories end with `/`).

### 5. search_files

Search for text patterns in files.

**Parameters:**
- `pattern` (required): Search pattern (regex supported)
- `path` (optional): Path to search (default: current directory)
- `file_pattern` (optional): File filter (e.g., "*.ts")

**Example:**
```json
{
  "tool": "search_files",
  "parameters": {
    "pattern": "TODO",
    "path": "src",
    "file_pattern": "*.ts"
  }
}
```

**Output:**
Returns matches with file path, line number, and content.

**Notes:**
- Automatically skips node_modules, .git, dist, build
- Case-insensitive by default

### 6. bash

Execute a shell command.

**Parameters:**
- `command` (required): Shell command to execute
- `timeout` (optional): Timeout in milliseconds (default: 30000)
- `cwd` (optional): Working directory

**Example:**
```json
{
  "tool": "bash",
  "parameters": {
    "command": "npm test",
    "timeout": 60000
  }
}
```

**Safety:**
- Requires user confirmation (dangerous tool)
- Blocks obviously dangerous commands (rm -rf /, etc.)
- Has timeout protection
- Returns both stdout and stderr

### 7. copy_file

Copy a file or directory.

**Parameters:**
- `source` (required): Source path
- `destination` (required): Destination path

**Example:**
```json
{
  "tool": "copy_file",
  "parameters": {
    "source": "template.ts",
    "destination": "src/new-module.ts"
  }
}
```

**Safety:**
- Creates snapshot before copying
- Creates destination directory if needed
- Handles both files and directories

### 8. move_file

Move or rename a file or directory.

**Parameters:**
- `source` (required): Source path
- `destination` (required): Destination path

**Example:**
```json
{
  "tool": "move_file",
  "parameters": {
    "source": "old-name.ts",
    "destination": "new-name.ts"
  }
}
```

**Safety:**
- Creates snapshot before moving
- Creates destination directory if needed

### 9. delete_file

Delete a file or directory.

**Parameters:**
- `path` (required): Path to delete

**Example:**
```json
{
  "tool": "delete_file",
  "parameters": {
    "path": "temp/old-file.ts"
  }
}
```

**Safety:**
- Requires user confirmation (dangerous tool)
- Creates snapshot before deleting
- Blocks deletion of critical system paths
- Recursive deletion for directories

### 10. create_directory

Create a new directory.

**Parameters:**
- `path` (required): Path of directory to create
- `recursive` (optional): Create parent directories (default: true)

**Example:**
```json
{
  "tool": "create_directory",
  "parameters": {
    "path": "src/new/nested/dir",
    "recursive": true
  }
}
```

## Safety Features

### Sandboxing

Tools are sandboxed to the working directory by default:

```typescript
{
  workingDirectory: '/path/to/project',
  sandboxPaths: ['/path/to/project'],
  // Files outside this path will be rejected
}
```

### User Confirmation

Dangerous tools require explicit user confirmation:

```
⚠️  Dangerous operation requested:
Tool: bash
Parameters: {
  "command": "rm temp/*"
}

Allow this operation? (yes/no):
```

Dangerous tools:
- `bash` - Can execute arbitrary commands
- `delete_file` - Permanently removes files

### Blocked Operations

Certain operations are automatically blocked:

**Critical path protection:**
```
/, /etc, /usr, /bin, /sbin, /home
```

**Dangerous bash commands:**
```
rm -rf /, mkfs, dd if=, fork bombs
```

### Snapshots

File-modifying tools automatically create snapshots:
- `write_file` - Before writing
- `edit_file` - Before editing
- `copy_file` - Before copying
- `move_file` - Before moving
- `delete_file` - Before deleting

Snapshots can be used to revert changes (see Memory documentation).

## Tool Usage in Chat

### How LLMs Use Tools

When tools are enabled, the LLM can call tools by responding with JSON:

```
User: Can you read the package.json file?