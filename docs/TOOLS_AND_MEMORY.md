# Tools & Memory Features - Complete Guide

This document provides a complete overview of the advanced Tools and Memory features added to Ollama CLI.

## What Was Added

The Ollama CLI now includes two powerful systems that transform it into an AI coding assistant similar to Claude Code:

### 1. Tools/MCP System
A Model Context Protocol (MCP) implementation that allows the AI to:
- Read and write files
- Edit files with precise replacements
- Execute bash commands
- Browse directories
- Search for patterns in files
- Perform file operations (copy, move, delete)

### 2. Memory/Snapshot System  
Automatic change tracking and rollback capability:
- Auto-snapshots before file modifications
- Complete change history
- Diff generation
- Revert to previous states
- Session-linked snapshots

## Quick Start

### Enable Tools

```bash
# Start chat with tools enabled
ollama-cli chat --tools

# With specific working directory
ollama-cli chat --tools --working-dir /path/to/project
```

### Use Tools in Conversation

```
You: Can you read the package.json file and tell me the version?