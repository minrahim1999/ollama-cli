# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ollama CLI is a professional command-line interface for Ollama (local LLM models), similar to Claude Code but powered by local models. It provides interactive chat, file operations via MCP tools, automatic snapshot/rollback, templates, planning, git integration, workflow automation, database tools, RAG system, API testing, and comprehensive productivity enhancements.

**Key Features:**
- **First-run setup with model verification** - Ensures required models are installed
- **Interactive command autocomplete** - Type "/" for real-time command suggestions
- **Agent system with keyboard navigation** - Framework-specific AI agents with arrow key selection
- **Batch processing** - Process multiple prompts from JSON/text files (NEW v2.4.0)
- **Conversation branching** - Git-like branching for conversations (NEW v2.4.0)
- **Context management** - Token budgets and smart filtering (NEW v2.4.0)
- **Diff-based editing** - Unified diff generation and parsing (NEW v2.4.0)
- **Enhanced prompt library** - Full CRUD with search and variables (NEW v2.4.0)
- Interactive REPL with 26+ MCP tools (read/write files, execute code, commands, git operations)
- 6 specialized AI assistants (File Writer, Coding Assistant, Code Reviewer, etc.)
- Automatic snapshot system for file changes with undo/revert capability
- Template library with 5 built-in templates and variable substitution
- Conversation export/import (JSON, Markdown, TXT)
- AI-powered git workflow (commit messages, PR summaries, code review)
- Full-featured planning system with auto-detection and step-by-step execution
- Code execution tool (Python, JavaScript, TypeScript, Shell)
- Model comparison for side-by-side testing
- Pipe mode for integrating with unix commands
- Syntax highlighting for code blocks
- Keyboard shortcuts (Ctrl+K/L, Ctrl+U, etc.)
- **Codebase indexing** with fuzzy symbol search
- **Test integration** with AI failure analysis
- **Workflow automation** with YAML-based workflows
- **Database tools** for SQLite queries and schema inspection
- **RAG system** with vector embeddings and semantic search
- **API testing** with HTTP client and response validation
- Project-aware context via `.ollama` directory
- Modern gradient-based UI with clean typography

## Build & Development Commands

```bash
# Build
npm run build              # Compile TypeScript to dist/

# Development
npm run dev                # Watch mode (tsc --watch)
npm run clean              # Remove dist/ folder

# Testing & Quality
npm test                   # Run vitest tests
npm test:coverage          # Test with coverage report
npm run lint               # ESLint on src/**/*.ts
npm run format             # Prettier format

# Local Testing
npm run build && node dist/cli.js chat --tools
```

## Architecture Overview

### Core Design Pattern

**Layer Separation:**
1. **CLI Entry** (`src/cli.ts`) - Routes commands via Commander.js
2. **Commands** (`src/commands/`) - Command handlers (chat, ask, config, etc.)
3. **Core Systems** - Business logic layers:
   - `src/api/` - Ollama API client with streaming + HTTP client for API testing
   - `src/tools/` - MCP tool registry & executor (26 tools including execute_code)
   - `src/memory/` - Snapshot system (SHA-256 hashing)
   - `src/session/` - Conversation persistence
   - `src/assistants/` - Assistant management
   - `src/agents/` - Agent system (parser, manager, creator)
   - `src/batch/` - Batch prompt processing from JSON/text files (NEW)
   - `src/branches/` - Conversation branching (git-like) (NEW)
   - `src/context/` - Context management with token budgets (NEW)
   - `src/diff/` - Diff generation and parsing utilities (NEW)
   - `src/prompts/` - Enhanced prompt library with CRUD operations (NEW)
   - `src/project/` - Project context & permissions
   - `src/templates/` - Template library with variable substitution
   - `src/export/` - Conversation export/import (JSON, Markdown, TXT)
   - `src/git/` - Git operations wrapper
   - `src/planning/` - Planning system with auto-detection and execution
   - `src/indexing/` - Codebase indexing and symbol search
   - `src/testing/` - Test runner and failure analysis
   - `src/workflows/` - YAML workflow executor
   - `src/database/` - SQLite client and schema inspection
   - `src/rag/` - Vector embeddings and similarity search
   - `src/utils/keyboard.ts` - Enhanced keyboard navigation with arrow keys
   - `src/utils/command-autocomplete.ts` - REPL command autocomplete system
   - `src/setup/` - First-run setup and model verification
4. **UI Layer** (`src/ui/`) - Display functions with gradient & syntax highlighting support (pure, no state mutation)

### Tool System Architecture

The MCP tool system follows a **registry → executor → implementation** pattern:

```typescript
// 1. Tool Registry (src/tools/registry.ts)
TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  read_file: { name, description, parameters, dangerous, needsSnapshot }
}

// 2. Tool Executor (src/tools/executor.ts)
class ToolExecutor {
  execute(request: ToolCallRequest): Promise<ToolResult>
  // Handles: validation, snapshots, sandboxing, confirmations
}

// 3. Implementations (src/tools/implementations.ts, file-tools.ts, etc.)
export async function readFile(params): Promise<string>
```

**Tool Categories:**
- **File System** (10 tools): read_file, write_file, edit_file, glob, tree, etc.
- **Code Execution** (2 tools): bash, execute_code (Python, JS, TS, Shell)
- **Code Analysis** (3 tools): analyze_code, find_symbol, get_imports
- **Git** (5 tools): git_status, git_diff, git_log, git_branch, git_commit
- **Project** (3 tools): npm_info, npm_install, run_script
- **Web** (2 tools): fetch_url, web_search

**Critical:** All file-modifying tools MUST create snapshots before execution. The executor automatically handles this if `needsSnapshot: true`.

### Snapshot System

**Location:** `~/.ollama-cli/snapshots/<session-id>/<snapshot-id>.json`

**Flow:**
1. Before file modification → `createSnapshot()` captures SHA-256 hash
2. Snapshot includes: timestamp, reason, file contents, diff
3. User can `/undo` (last change) or `/revert <id>` (specific snapshot)

**Implementation:** `src/memory/index.ts` uses crypto.createHash('sha256') for integrity verification.

### Assistant System

**Storage:** `~/.ollama-cli/assistants.json`

6 built-in assistants with different system prompts:
- `file-writer` - Write mode (auto-uses tools)
- `coding-assistant` - Default, full tool access
- `code-reviewer` - Reviews code for issues
- `documentation-writer` - Creates docs
- `debugger` - Debugging helper
- `chat-only` - No tool access

**Usage in code:**
```typescript
const assistant = await getAssistant(assistantId);
const systemPrompt = assistant.systemPrompt;
```

### Agent System

**Storage Locations:**
- Global: `~/.ollama-cli/agents/*.md`
- Project: `.ollama/agents/*.md`

**Architecture:**
Agents are specialized AI assistants defined in markdown files with YAML frontmatter. They provide framework-specific expertise (Laravel, React, Django, etc.) and can be scoped globally or per-project.

**Agent Definition Structure:**
```markdown
---
name: laravel-developer
description: Laravel development expert
framework: laravel
language: php
version: 1.0.0
author: AI Generated
tags: laravel, php, backend
createdAt: 2026-01-01T00:00:00.000Z
updatedAt: 2026-01-01T00:00:00.000Z
---

# Laravel Developer

## Context
[Detailed domain expertise]

## Capabilities
- Capability 1
- Capability 2

## Instructions
[Behavioral guidelines]

## Tools Available
- read_file
- write_file
- bash

## Example Prompts
- Example 1
- Example 2

## Constraints
- Limitation 1
```

**Core Files:**
- `src/agents/parser.ts` - Markdown parsing (frontmatter + sections)
- `src/agents/manager.ts` - CRUD operations (load, save, list, delete)
- `src/agents/creator.ts` - Auto-generation and templates
- `src/commands/agent-cmd.ts` - CLI command handler
- `src/types/agent.ts` - Type definitions

**Usage in code:**
```typescript
// Load agent
const agent = await loadAgent('laravel-developer');
const systemPrompt = getAgentSystemPrompt(agent.definition);

// Use in chat
ollama-cli chat --agent laravel-developer
```

**Key Functions:**
- `parseAgentMarkdown()` - Parse markdown to AgentDefinition
- `generateAgentMarkdown()` - Generate markdown from definition
- `autoGenerateAgent()` - AI-powered agent creation
- `createAgentTemplate()` - Manual template creation
- `loadAgent(name, scope?)` - Load agent by name
- `saveAgent(definition, scope)` - Save to .md file
- `listAgents()` - List all agents (global + project)
- `getAgentSystemPrompt()` - Generate system prompt

**CLI Commands:**
```bash
ollama-cli agent list                    # List all agents
ollama-cli agent create                  # Interactive creation
ollama-cli agent show <name>             # Show details
ollama-cli agent edit <name>             # Edit definition
ollama-cli agent delete <name>           # Delete agent
ollama-cli chat --agent <name>           # Use in chat
```

**Keyboard Navigation:**
Implemented in `src/utils/keyboard.ts`:
- `selectWithKeyboard()` - Single selection with arrow keys
- `multiSelectWithKeyboard()` - Multi-selection with checkboxes
- Arrow keys (↑↓) to navigate
- Space to toggle checkboxes
- Enter to confirm
- Escape to cancel
- TTY detection with fallback to numbered input

### Command Autocomplete System

**Purpose:** Interactive autocomplete for REPL commands in chat sessions

**Implementation:** `src/utils/command-autocomplete.ts`

**How It Works:**
1. User types "/" in chat → triggers autocomplete
2. Shows all 25+ REPL commands with descriptions
3. User types more (e.g., "/e") → filters to matching commands
4. Arrow keys to navigate, Tab/Enter to select
5. Selected command fills the input line

**Command Registry:**
```typescript
export const REPL_COMMANDS: CommandDefinition[] = [
  { command: '/help', description: 'Show help', category: 'Help' },
  { command: '/new', description: 'Start new conversation', category: 'Session' },
  { command: '/export', description: 'Export conversation',
    usage: '/export [format] [filename]', category: 'Export' },
  // ... 25+ commands total
];
```

**Key Functions:**
- `filterCommands(searchTerm)` - Real-time filtering by command name or description
- `showCommandAutocomplete(currentInput)` - Display autocomplete UI with keyboard navigation

**Integration:**
Modified `setupKeyboardShortcuts()` in `src/commands/chat-enhanced.ts`:
```typescript
// Trigger autocomplete on "/"
if (key.sequence === '/' && rl.line === '') {
  const selected = await showCommandAutocomplete('/');
  if (selected) {
    rl.line = selected; // Fill selected command
  }
}
```

**Features:**
- Shows up to 8 commands at a time
- Selected command displays usage syntax
- Real-time filtering as user types
- Backspace to refine search
- Escape to cancel
- Default selection on top match
- Categories: Session, Tools, Snapshots, Templates, Git, Planning, etc.

### Project Context System

**Directory:** `.ollama/` (like Claude's `.claude/`)

**Files:**
- `.ollama/config.json` - Permissions (canReadFiles, canWriteFiles, canExecuteCommands)
- `PROJECT.md` - Project context loaded into every chat session

**First-run flow:**
1. `detectProjectContext()` checks for `.ollama/`
2. If missing, `promptForPermissions()` asks user
3. `initializeProject()` creates `.ollama/` and `PROJECT.md`
4. Permissions stored, context loaded automatically

### Enhanced UI System

**Message Display Pattern:**
```
╭─ You                    (Cyan box)
│ user message
╰─

  ┌─ 🔧 Tool: read_file  (Blue, indented)
  │ path: src/config.ts
  │ ⏳ Executing
  │ ✓ Success
  │ [summary, not full JSON]
  └─

╭─ 🤖 Assistant          (Green box)
│ assistant response
╰─
```

**Implementation:** `src/ui/display.ts`
- `displayUserMessage()` - Cyan box
- `displayAssistantMessageStart/End()` - Green box
- `displayToolExecutionStart/Success/Failure()` - Blue box
- `summarizeToolResult()` - Condenses JSON (avoids wall of text)

**Streaming:** Use `formatStreamingChunk()` to add `│` prefix to newlines in real-time responses.

## TypeScript Configuration

**Critical settings in `tsconfig.json`:**
- `exactOptionalPropertyTypes: true` - ALL optional properties MUST be `| undefined`
- `strict: true` - No implicit any, strict null checks
- `noUnusedLocals/Parameters: true` - Catch unused vars
- `module: "ESNext"` with `moduleResolution: "bundler"` - Modern ESM

**Common gotcha:**
```typescript
// ❌ Wrong
interface Foo { bar?: string }

// ✅ Correct
interface Foo { bar?: string | undefined }
```

## File Modification Workflow

When editing code that modifies files:

1. **Check if tool needs snapshot:** Add `needsSnapshot: true` to tool definition
2. **Executor handles snapshot:** `ToolExecutor.execute()` automatically creates snapshot
3. **Implement safely:**
   ```typescript
   // Use fs.promises (async)
   import fs from 'fs/promises';

   // Validate paths (sandboxing)
   const sanitized = path.resolve(workingDir, filePath);
   if (!sanitized.startsWith(workingDir)) {
     throw new Error('Path outside working directory');
   }
   ```

## Session & Configuration

**Config hierarchy (highest to lowest priority):**
1. CLI flags (`--model llama2`)
2. Environment variables (`OLLAMA_MODEL=llama2`)
3. Config file (`~/.ollama-cli/config.json`)
4. Defaults in `src/config/index.ts`

**Config implementation:** `getEffectiveConfig()` merges all sources.

**Session storage:** `~/.ollama-cli/sessions/<uuid>.json`
- Auto-save after every message
- Resume with `-s <id>` or `/load <id>`

## Command Routing

`src/cli.ts` uses Commander.js:

```typescript
program
  .name('ollama-cli')
  .action(async (options) => {
    // Default: starts coding assistant with tools
    await chatCommandEnhanced({ ...options, tools: true });
  });

program.command('chat').action(chatCommand);
program.command('write').action(writeCommand);  // Uses file-writer assistant
program.command('assistant <command>').action(assistantCommand);
program.command('init').action(initCommand);
```

**Default behavior:** Running `ollama-cli` (no args) starts the coding assistant with tools enabled.

## Chat REPL Commands

Implemented in `src/commands/chat-enhanced.ts` via `handleCommand()`:

- `/help` - Categorized help display
- `/new` - Clear screen + start new session
- `/clear, /clean` - Clear screen + clear history
- `/exit, /quit` - Save & exit (single goodbye message)
- `/tools` - List 25 tools
- `/snapshots` - Show snapshot history
- `/undo` - Revert last file change
- `/revert <id>` - Revert to specific snapshot
- `/stats` - Tool usage statistics

**IMPORTANT:** `/exit` sets `isExiting` flag to prevent duplicate "Goodbye!" from readline close event.

## Testing

**Framework:** Vitest

**Run tests:**
```bash
npm test                    # All tests
npm test src/config         # Specific module
npm test:coverage           # With coverage
```

**Test structure:**
- `*.test.ts` files in same directory as implementation
- Mock Ollama API responses for integration tests
- Cover: config merging, session CRUD, snapshot integrity

## New Core Systems (v2.4.0)

### Batch Processing System

**Location:** `src/batch/index.ts`

Processes multiple prompts from JSON or text files in sequence or parallel.

**File Formats:**
```typescript
// JSON format
[
  { id: 'task-1', prompt: 'Prompt 1', variables: { key: 'value' } },
  { id: 'task-2', prompt: 'Prompt 2' }
]

// Text format (one prompt per line)
Prompt 1
Prompt 2
Prompt 3
```

**Key Functions:**
- `loadBatchFile(filePath)` - Load structured JSON batch file
- `loadBatchTextFile(filePath)` - Load line-by-line text file
- `saveBatchResults(results, outputPath)` - Save execution results

**Result Structure:**
```typescript
{
  id: string,
  prompt: string,
  variables?: Record<string, unknown>,
  status: 'success' | 'error',
  output?: string,
  error?: string,
  executionTime: number
}
```

### Conversation Branching System

**Location:** `src/branches/index.ts`

Git-like branching for conversations, allowing multiple conversation paths from a single point.

**Branch Metadata Structure:**
```typescript
{
  currentBranchId: string,
  branches: [
    {
      id: string,
      name: string,
      parentId?: string,
      createdAt: string,
      messageStartIndex: number,
      isActive: boolean
    }
  ]
}
```

**Key Functions:**
- `initializeBranches(messages)` - Create initial main branch
- `createBranch(metadata, name, parentId?, startIndex?)` - Create new branch
- `switchBranch(metadata, branchId)` - Switch active branch
- `listBranches(metadata)` - List all branches
- `deleteBranch(metadata, branchId)` - Delete branch (except main)
- `getCurrentBranch(metadata)` - Get active branch
- `updateBranchMessages(metadata, branchId, messages)` - Update branch messages

**Use Cases:**
- A/B testing different conversation approaches
- Exploring multiple solution paths
- Maintaining conversation history across different contexts
- Rolling back to earlier conversation states

### Context Management System

**Location:** `src/context/index.ts`

Manages conversation context with token budgets, filtering rules, and auto-summarization.

**Context Configuration:**
```typescript
{
  rules: ContextRule[],        // Include/exclude patterns
  tokenBudget?: number,         // Max tokens (optional)
  autoSummarize: boolean,       // Auto-compress when over budget
  includeFiles: boolean,        // Include file contents in context
  priorityMessages?: string[]   // Always-include message IDs
}

// ContextRule structure
{
  type: 'include' | 'exclude',
  pattern: string,              // Regex pattern
  field: 'role' | 'content'     // Which field to match
}
```

**Key Functions:**
- `getDefaultContextConfig()` - Get default configuration
- `estimateTokens(messages)` - Estimate token count (~4 chars/token)
- `matchesRules(message, rules)` - Check if message matches rules
- `filterMessages(messages, config)` - Apply filtering rules
- `getContextStats(messages)` - Get token/message statistics
- `addContextRule(config, rule)` - Add new filtering rule
- `setTokenBudget(config, budget)` - Set token budget
- `summarizeMessages(messages)` - Summarize to reduce tokens (TODO)

**Token Estimation:**
Uses approximate 4 characters per token heuristic. For production, consider using tiktoken or similar.

### Diff-Based Code Application

**Location:** `src/diff/index.ts`

Generates and parses unified diffs for safe code modifications.

**Diff Structure:**
```typescript
{
  oldFile: string,
  newFile: string,
  hunks: [
    {
      oldStart: number,
      oldLines: number,
      newStart: number,
      newLines: number,
      lines: string[]  // Prefixed with ' ', '+', or '-'
    }
  ]
}
```

**Key Functions:**
- `generateDiff(oldContent, newContent, filePath)` - Generate unified diff
- `parseDiff(diffText)` - Parse diff text into structured hunks
- `extractFilePath(diffLine)` - Extract file path from --- or +++ line
- `applyDiff(filePath, diff)` - Apply diff to file (TODO)
- `previewDiff(diff)` - Format diff for display

**Diff Format:**
```diff
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 line 1
-old line 2
+new line 2
 line 3
```

**Integration:**
- Used by snapshot system for change tracking
- Enables precise code modifications via AI
- Foundation for diff-based editing tool

### Enhanced Prompt Library

**Location:** `src/prompts/index.ts`

Full-featured prompt management with CRUD operations, variables, and search.

**Prompt Structure:**
```typescript
{
  name: string,                 // Unique identifier
  content: string,              // Template with {{variables}}
  description?: string,
  category?: string,            // code, docs, git, general
  tags: string[],               // Multiple tags
  variables: string[],          // Auto-extracted from {{var}}
  createdAt: string,
  updatedAt: string
}
```

**Storage:** `~/.ollama-cli/prompts.json`

**Key Functions:**
- `createPrompt(prompt)` - Create new prompt
- `getPrompt(name)` - Get prompt by name
- `updatePrompt(name, updates)` - Update existing prompt
- `deletePrompt(name)` - Delete prompt
- `listPrompts()` - List all prompts
- `searchPrompts(query)` - Search across all fields
- `extractVariables(content)` - Extract {{variables}} from template
- `renderPrompt(prompt, variables)` - Substitute variables with values

**Variable Syntax:**
```typescript
// Template
const template = "Review this {{language}} code in {{file}}";

// Variables
const vars = { language: 'TypeScript', file: 'app.ts' };

// Result
const rendered = renderPrompt(prompt, vars);
// "Review this TypeScript code in app.ts"
```

**Search:**
Searches across: name, content, description, category, and tags (case-insensitive).

## Common Patterns

### Adding a new tool:

1. Add to `src/types/tools.ts`:
   ```typescript
   export type ToolName = ... | 'my_new_tool';
   ```

2. Add definition in `src/tools/registry.ts`:
   ```typescript
   my_new_tool: {
     name: 'my_new_tool',
     description: 'Does something',
     parameters: [...],
     dangerous: false,
     needsSnapshot: true  // if modifies files
   }
   ```

3. Implement in appropriate file (`src/tools/implementations.ts` or new file):
   ```typescript
   export async function myNewTool(params: MyParams): Promise<MyResult>
   ```

4. Add case in `src/tools/executor.ts`:
   ```typescript
   case 'my_new_tool': return await myNewTool(params);
   ```

### Adding a new assistant:

Use `assistants/index.ts` functions:
```typescript
await createAssistant({
  name: 'My Assistant',
  description: 'Does X',
  systemPrompt: '...',
  toolsEnabled: true,
  emoji: '🎯'
});
```

Or modify `getDefaultAssistants()` for built-in assistants.

## Environment Variables

- `OLLAMA_BASE_URL` - Override Ollama API URL
- `OLLAMA_MODEL` - Override default model
- `OLLAMA_CLI_DEBUG` - Enable debug logging

## Troubleshooting Development

**Build fails with "Cannot find module":**
- Ensure all imports end with `.js` (ESM requirement)
- Check `tsconfig.json` has `"moduleResolution": "bundler"`

**"exactOptionalPropertyTypes" errors:**
- Add `| undefined` to all optional properties

**Double goodbye on /exit:**
- Fixed: exit command calls `process.exit()` directly before close event fires

**Tool results showing raw JSON:**
- Use `summarizeToolResult()` to condense output for display
- LLM still receives full JSON, user sees summary

## Quick-Win Features (v2.1.0)

### Code Execution Tool

**Implementation:** `src/tools/implementations.ts` - `executeCode()`

The execute_code tool runs code in multiple languages:
- **Python**: Uses `python3 -c`
- **JavaScript**: Uses `node -e`
- **TypeScript**: Writes temp file, uses `npx tsx`
- **Shell**: Direct execution

**Safety:**
- Marked as dangerous (requires confirmation)
- 30s timeout default
- Captures stdout/stderr
- Auto-cleanup of temp files

### Model Comparison

**Implementation:** `src/commands/compare.ts`

Compares multiple models in parallel:
- Executes requests simultaneously
- Displays side-by-side with syntax highlighting
- Shows timing, response length metrics
- Default models: configured + llama3.1 + mistral

**Usage Pattern:**
```bash
ollama-cli compare "prompt" --models model1,model2,model3
```

### Pipe Mode

**Implementation:** `src/commands/ask.ts` - `readStdin()`

Detects when stdin is not a TTY and reads piped data:
- 100ms timeout for detection
- Prepends stdin data to prompt
- Enables unix pipeline integration

**Common patterns:**
```bash
git diff | ollama-cli ask "review"
cat log.txt | ollama-cli ask "summarize"
```

### Syntax Highlighting

**Implementation:** `src/ui/syntax.ts`

Simple chalk-based highlighting:
- Extracts code blocks with regex: `/```(\w+)?\n([\s\S]*?)```/g`
- Language-specific keyword highlighting
- String, number, comment, function call detection
- Applied in: compare command, future streaming enhancements

**Pattern:**
```typescript
const highlighted = highlightText(response);
// Returns text with ANSI color codes
```

### Keyboard Shortcuts

**Implementation:** `src/commands/chat-enhanced.ts` - `setupKeyboardShortcuts()`

Uses readline keypress events:
- Enables raw mode for TTY
- Listens for Ctrl+K/L (clear screen)
- Ctrl+U clears current line
- Only activates in interactive terminals

**Key Handling:**
```typescript
process.stdin.on('keypress', (chunk, key) => {
  if (key.ctrl && key.name === 'k') {
    console.clear();
    rl.prompt();
  }
});
```

## High-Impact Features (v2.2.0)

### Codebase Indexing

**Implementation:** `src/indexing/`

**Architecture:**
- `parser.ts` - Regex-based symbol extraction for TS/JS/Python
- `index.ts` - Index builder, storage, and search engine  
- `commands/index-cmd.ts` - CLI command handler

**Index Structure:**
```typescript
interface CodebaseIndex {
  version: string;
  indexedAt: string;
  projectRoot: string;
  files: FileIndex[];  // Per-file symbols, imports, exports
  totalSymbols: number;
  totalFiles: number;
}
```

**Symbol Types:**
- Functions (including arrow functions)
- Classes  
- Interfaces
- Type aliases
- Constants, let, var declarations

**Search Algorithm:**
- Exact match: score 1.0
- Starts with: score 0.8
- Contains: score 0.6
- Fuzzy match: score 0.4

**Storage:** `~/.ollama-cli/index/codebase-index.json`

**Commands:**
```bash
ollama-cli index build    # Build if needed
ollama-cli index rebuild  # Force rebuild
ollama-cli index stats    # Show statistics
/index build              # REPL command
/search MyClass           # REPL search
```

### Test Integration

**Implementation:** `src/testing/runner.ts`

**Framework Detection:**
1. Check devDependencies (vitest, jest, mocha)
2. Check package.json test script
3. Check for pytest.ini
4. Fallback to npm test

**Test Parsers:**
- **Jest/Vitest**: Parses `● test name` blocks
- **Mocha**: Parses numbered failure blocks
- **Pytest**: Parses `FAILED file::test` format
- **Generic**: Fallback for unknown formats

**Output Parsing:**
- Extracts test names, errors, stack traces
- Counts passed/failed/skipped
- Measures duration
- Returns structured TestResult

**AI Integration:**
- Automatically sends failures to AI
- Formats up to 3 failures for analysis
- AI explains errors and suggests fixes
- Reduces context switching

**Usage:**
```bash
/test  # Run tests and get AI analysis
```

**Benefit:**  
Integrates TDD workflow directly into AI chat, making test failures instantly actionable with AI-powered explanations.

## New Advanced Features (v2.3.0)

### Workflow Automation

**Implementation:** `src/workflows/executor.ts`, `src/commands/workflow.ts`

**Storage:** `.ollama/workflows/*.yml`

**Workflow Structure:**
```yaml
name: Workflow Name
description: Description
variables:  # Optional
  VAR_NAME: value
steps:
  - name: Step name
    type: bash|test|index|git|file|ai
    command: command to execute
    continueOnError: true  # Optional
```

**Step Types:**
- `bash`: Execute shell command (uses execAsync)
- `test`: Run test suite (uses src/testing/runner.ts)
- `index`: Build codebase index (uses src/indexing/index.ts)
- `git`: Execute git command (prefixes with "git ")
- `file`: Read file contents
- `ai`: AI prompt (placeholder for future)

**Variable Substitution:**
- `${variable}` format in commands
- `$variable` format also supported

**Execution Flow:**
1. Load YAML workflow from `.ollama/workflows/`
2. Execute steps sequentially
3. Stop on error unless `continueOnError: true`
4. Track timing for each step
5. Return WorkflowResult with all step results

**Commands:**
```bash
ollama-cli workflow list         # List workflows in .ollama/workflows/
ollama-cli workflow show deploy  # Show workflow details
ollama-cli workflow run deploy   # Execute workflow
```

### Database Tools

**Implementation:** `src/database/sqlite.ts`, `src/commands/database.ts`

**Library:** better-sqlite3

**Features:**
- Execute SQL queries (SELECT, INSERT, UPDATE, DELETE)
- Schema inspection (tables, views, columns, indexes)
- Foreign key relationship detection
- Table row counting
- Query performance metrics

**SQLiteClient Methods:**
```typescript
query(sql: string, params: unknown[]): QueryResult
getSchema(): SchemaInfo
getTableInfo(tableName: string): TableInfo
```

**Commands:**
```bash
ollama-cli database query "SELECT * FROM users" --file ./db.db
ollama-cli database schema --file ./db.db
ollama-cli database tables --file ./db.db
ollama-cli database describe users --file ./db.db
```

**Default Database:** `./database.db` (use --file to override)

### RAG System

**Implementation:** `src/rag/index.ts`, `src/rag/embeddings.ts`, `src/commands/rag.ts`

**Storage:** `~/.ollama-cli/rag/vector-store.json`

**Embedding Model:** nomic-embed-text (default, configurable)

**Architecture:**
1. **Embeddings:** Generate vectors using Ollama's `/embeddings` API
2. **Vector Store:** In-memory JSON store with metadata
3. **Similarity Search:** Cosine similarity (dot product / magnitudes)

**Document Structure:**
```typescript
{
  id: UUID,
  content: string,
  metadata: {
    source: file path or manual,
    type: code|documentation|text,
    language: typescript|python|etc,
    createdAt: ISO timestamp,
    size: number
  },
  embedding: number[]  // 768 dimensions for nomic-embed-text
}
```

**Similarity Scoring:**
- Range: 0-1 (1 = identical, 0 = orthogonal)
- Default min score: 0.5
- Uses cosine similarity formula

**Batch Processing:**
- Embeddings generated in batches of 5 concurrent requests
- Progress callbacks for large codebase indexing

**Commands:**
```bash
ollama-cli rag add "text" --type documentation
ollama-cli rag add --file README.md
ollama-cli rag search "query" --topk 5 --min-score 0.5
ollama-cli rag index  # Index entire codebase
ollama-cli rag stats
ollama-cli rag clear
```

**Use Cases:**
- Semantic code search
- Documentation retrieval
- Context for AI from large codebases
- Foundation for advanced RAG features

### API Testing

**Implementation:** `src/api/http.ts`, `src/commands/api.ts`

**HTTP Client:** Native fetch API

**Features:**
- Execute HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Custom headers support
- JSON and raw body support
- Response validation with multiple rule types
- Test suite execution from JSON files
- Performance metrics

**Validation Rules:**
```typescript
{
  type: 'status' | 'header' | 'body' | 'json-path' | 'schema',
  field?: string,  // For header or json-path
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'gt' | 'lt',
  value?: unknown
}
```

**Validation Types:**
- **Status:** Validate HTTP status code (equals, gt, lt)
- **Header:** Check header existence or value (exists, equals, contains)
- **Body:** Search body text (contains, matches regex)
- **JSON Path:** Validate JSON fields (exists, equals) - supports dot notation
- **Schema:** Basic schema validation (placeholder)

**Commands:**
```bash
ollama-cli api request https://example.com/api/users
ollama-cli api request https://example.com/api \
  --method POST \
  --header "Authorization: Bearer token" \
  --data '{"key": "value"}' \
  --timeout 10000

ollama-cli api test tests.json
```

**Test File Format:**
```json
[
  {
    "name": "Test Name",
    "request": {
      "url": "https://example.com/api",
      "method": "GET",
      "headers": {},
      "body": {}
    },
    "validation": [
      { "type": "status", "operator": "equals", "value": 200 }
    ]
  }
]
```

**Output:**
- Colored status codes (green <300, yellow <500, red >=500)
- Full headers display
- JSON pretty-printing
- Request duration in milliseconds
- Test results with pass/fail icons

## Security & Setup System

### First-Run Setup

**Implementation:** `src/setup/index.ts`, `src/commands/setup.ts`

**Storage:** `~/.ollama-cli/setup.json`

**Setup Flow:**
1. Check if setup has been completed (reads setup.json)
2. If first run:
   - **Prompt for base URL** - Ask user for Ollama server URL (default or custom)
   - **Validate URL** - Check format and remove trailing slashes/api suffix
   - **Test connection** - Verify Ollama is reachable at the URL
   - **Save configuration** - Store baseUrl in `~/.ollama-cli/config.json`
   - Test Ollama connection
   - List available models
   - Verify required models exist
   - Prompt user to install missing models
   - Save setup state
3. If previously setup:
   - Verify models periodically (every 7 days)
   - Re-check model availability
   - Update last check timestamp

**Setup State:**
```typescript
{
  initialized: boolean,
  modelsChecked: boolean,
  lastCheck: ISO timestamp,
  requiredModels: {
    chat: "llama3.2",
    embedding: "nomic-embed-text"
  }
}
```

**Model Checks:**
- **Chat Model**: Required for all LLM operations (chat, ask, compare)
- **Embedding Model**: Optional, needed for RAG features

**Integration:**
- Runs automatically before chat, ask, compare commands
- Can be skipped with `--skip-setup` flag
- Exits with code 1 if models missing

**Commands:**
```bash
ollama-cli setup init    # Run setup manually
ollama-cli setup status  # Show current status
ollama-cli setup reset   # Clear setup state
```

**Security Benefits:**
- Prevents running with incompatible/missing models
- Early error detection
- Clear user guidance
- Protects against runtime failures
- Ensures consistent user experience

**Auto-Download Feature:**
- Prompts user for permission before downloading
- Shows storage warning (models are 1-10 GB)
- Tracks download progress with:
  - Status messages (pulling manifest, downloading, verifying)
  - Percentage complete
  - Downloaded size / Total size (formatted: MB, GB)
  - Real-time spinner updates
- Handles errors gracefully
- Falls back to manual instructions if download fails

**Download Implementation:**
```typescript
// Uses Ollama's /pull API endpoint
await client.pullModel(modelName, (progress) => {
  const { status, completed, total } = progress;
  const percentage = Math.round((completed / total) * 100);
  const downloaded = formatBytes(completed);  // "1.2 GB"
  const totalSize = formatBytes(total);       // "2.7 GB"
  
  // Update spinner: "pulling manifest - 45% (1.2 GB / 2.7 GB)"
});
```

**User Prompts:**
- Uses readline for interactive Yes/No confirmation
- Default is Yes (press Enter to accept)
- Can decline to install manually later
- Non-blocking - respects user's choice
### Base URL Configuration

**Implementation:** `src/setup/index.ts` - `promptForBaseUrl()`, `testOllamaConnection()`

**Interactive Prompt Flow:**
1. Display base URL configuration screen
2. Offer default (http://localhost:11434) or custom URL
3. If custom selected:
   - Prompt for URL input with validation
   - Loop until valid URL provided
   - Remove trailing slashes and `/api` suffix
   - Validate protocol (http or https only)
4. Test connection to Ollama server
5. Save to `~/.ollama-cli/config.json` on success

**Key Functions:**

**promptForBaseUrl():**
```typescript
async function promptForBaseUrl(): Promise<string> {
  // 1. Show selection: default vs custom
  const choice = await select('Choose Ollama server:', [
    'Use default (http://localhost:11434)',
    'Enter custom URL'
  ]);

  // 2. Validate custom URL if selected
  // 3. Return clean base URL (no trailing slash/api)
}
```

**testOllamaConnection(baseUrl):**
```typescript
async function testOllamaConnection(baseUrl: string): Promise<boolean> {
  // 1. Create temporary OllamaClient with baseUrl + '/api'
  // 2. Call listModels() to test connection
  // 3. Return true if successful, false otherwise
}
```

**Validation Rules:**
- Must be valid URL format
- Protocol must be `http://` or `https://`
- Automatically removes trailing `/`
- Automatically removes `/api` suffix
- Tests actual connection before saving

**Configuration Storage:**
- Saved to: `~/.ollama-cli/config.json`
- Key: `baseUrl`
- Format: `http://hostname:port/api`
- Example: `http://localhost:11434/api`

**Priority Hierarchy:**
1. Environment variable: `OLLAMA_BASE_URL`
2. Config file: `~/.ollama-cli/config.json` (set during setup)
3. Default: `http://localhost:11434/api`

**Config Management:**
```bash
# View current URL
ollama-cli config get baseUrl

# Change URL
ollama-cli config set baseUrl http://192.168.1.100:11434

# List all config
ollama-cli config list

# Reset to defaults
ollama-cli config reset
```

**Benefits:**
- No `.env` files needed (cleaner project)
- Interactive validation prevents errors
- Connection tested before saving
- Easy to change later via config command
- Supports remote Ollama servers
- Global configuration for all sessions

