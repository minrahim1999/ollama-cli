# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ollama CLI is a professional command-line interface for Ollama (local LLM models), similar to Claude Code but powered by local models. It provides interactive chat, file operations via MCP tools, automatic snapshot/rollback, templates, planning, and git integration.

**Key Features:**
- Interactive REPL with 25+ MCP tools (read/write files, execute commands, git operations)
- 6 specialized AI assistants (File Writer, Coding Assistant, Code Reviewer, etc.)
- Automatic snapshot system for file changes with undo/revert capability
- Template library with 5 built-in templates and variable substitution
- Conversation export/import (JSON, Markdown, TXT)
- AI-powered git workflow (commit messages, PR summaries, code review)
- Full-featured planning system with auto-detection and step-by-step execution
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
   - `src/api/` - Ollama API client with streaming
   - `src/tools/` - MCP tool registry & executor
   - `src/memory/` - Snapshot system (SHA-256 hashing)
   - `src/session/` - Conversation persistence
   - `src/assistants/` - Assistant management
   - `src/project/` - Project context & permissions
   - `src/templates/` - Template library with variable substitution
   - `src/export/` - Conversation export/import (JSON, Markdown, TXT)
   - `src/git/` - Git operations wrapper
   - `src/planning/` - Planning system with auto-detection and execution
4. **UI Layer** (`src/ui/`) - Display functions with gradient support (pure, no state mutation)

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
