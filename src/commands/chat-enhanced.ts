/**
 * Enhanced interactive chat command with tools and memory support
 * Provides a REPL interface with MCP tools integration
 */

import readline from 'readline';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import type { ChatSession } from '../types/index.js';
import type { ToolCallRequest } from '../types/tools.js';
import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import { getDefaultAssistant, getAssistant } from '../assistants/index.js';
import { loadAgent, getAgentSystemPrompt } from '../agents/manager.js';
import { detectProjectContext, readProjectMd } from '../project/index.js';
import { promptForPermissions } from '../project/permissions.js';
import { updateProjectTimestamp } from '../project/update.js';
import {
  createSession,
  loadSession,
  saveSession,
  addMessage,
  clearMessages,
} from '../session/index.js';
import {
  // getCurrentMode, // TODO: Use in updatePrompt
  cyclePermissionMode,
  toggleVerboseMode,
  getModeIndicator,
  getModeDescription,
  // TODO: Integrate these in tool execution logic
  // isVerboseMode,
  // shouldExecuteTool,
  // shouldAutoApproveTool,
} from '../modes/permission.js';
import {
  cycleOutputStyle,
  getStyleDescription,
  // getCurrentStyle, // TODO: Display current style in prompt or status
} from '../modes/output-styles.js';
import {
  augmentMessagesForVerbose,
  // formatVerboseResponse, // TODO: Use for post-processing verbose responses
} from '../modes/verbose.js';
import { interactiveRewind } from '../rewind/index.js';
import {
  displayWelcome,
  displayCodingAssistantWelcome,
  displayError,
  displaySuccess,
  displayInfo,
  displayModels,
  displayAssistantMessageStart,
  displayAssistantMessageEnd,
  formatStreamingChunk,
  displayToolExecutionStart,
  displayToolExecutionSuccess,
  displayToolExecutionFailure,
  summarizeToolResult,
  displayThinking,
  clearThinking,
} from '../ui/display.js';
import { gradients, colors, symbols } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';
import { ToolExecutor } from '../tools/executor.js';
import { getToolsPrompt, getAllTools } from '../tools/registry.js';
import {
  listSnapshots,
  revertToSnapshot,
  loadSnapshot,
  cleanOldSnapshots,
} from '../memory/index.js';
import { compareSnapshots, formatFullDiff } from '../memory/diff.js';
import { getTemplate, renderTemplate } from '../templates/index.js';
import { parseVariables } from './template.js';
import { displayUserMessage } from '../ui/display.js';
import { exportSession } from '../export/index.js';
import type { ExportFormat } from '../types/export.js';
import { isGitRepository, getStagedDiff } from '../git/index.js';
import { GIT_TEMPLATES } from '../templates/git-templates.js';
import type { CommitStyle } from '../types/git.js';
import { shouldTriggerPlanning } from '../planning/detector.js';
import { createPlan, listPlans } from '../planning/index.js';
import { showCommandAutocomplete } from '../utils/command-autocomplete.js';

interface ChatOptions {
  model?: string;
  session?: string;
  system?: string;
  tools?: boolean; // Enable tools mode
  workingDir?: string;
  assistant?: string; // Assistant ID to use
  agent?: string; // Agent name to use (e.g., laravel-developer)
}

/**
 * Set up custom keyboard shortcuts for readline
 */
function setupKeyboardShortcuts(
  rl: readline.Interface,
  getSession: () => ChatSession
): void {
  // Enable keypress events
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin, rl);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    let autocompleteActive = false;

    process.stdin.on('keypress', async (_chunk, key) => {
      if (!key) return;

      // Don't handle shortcuts if autocomplete is active
      if (autocompleteActive) return;

      const currentLine = (rl as unknown as { line: string }).line;

      // Ctrl+K or Ctrl+L: Clear screen
      if (key.ctrl && (key.name === 'k' || key.name === 'l')) {
        console.clear();
        rl.prompt();
        return;
      }

      // Ctrl+U: Clear current line
      if (key.ctrl && key.name === 'u') {
        (rl as unknown as { line: string }).line = '';
        rl.prompt();
        // Force cursor to beginning
        process.stdout.write('\r\x1b[K');
        rl.prompt();
        return;
      }

      // Shift+Tab: Cycle permission modes (Normal → Auto-Accept → Plan)
      if (key.shift && key.name === 'tab') {
        const newMode = cyclePermissionMode();
        const indicator = getModeIndicator(newMode);
        const description = getModeDescription(newMode);
        console.log('');
        console.log(chalk.cyan(`${indicator} Mode: ${description}`));
        console.log('');
        // Update prompt to show new mode
        rl.setPrompt(chalk.cyan(`${indicator} You: `));
        rl.prompt();
        return;
      }

      // Ctrl+O: Toggle verbose mode (extended thinking)
      if (key.ctrl && key.name === 'o') {
        const isVerbose = toggleVerboseMode();
        console.log('');
        console.log(chalk.cyan(`Verbose mode: ${isVerbose ? 'ON' : 'OFF'}`));
        console.log('');
        rl.prompt();
        return;
      }

      // Ctrl+Y: Cycle output styles
      if (key.ctrl && key.name === 'y') {
        const newStyle = cycleOutputStyle();
        const description = getStyleDescription(newStyle);
        console.log('');
        console.log(chalk.cyan(`Output style: ${description}`));
        console.log('');
        rl.prompt();
        return;
      }

      // Esc+Esc: Rewind capability (roll back code and conversation)
      // Track Esc key presses
      if (key.name === 'escape') {
        const now = Date.now();
        const lastEscape = (rl as unknown as Record<string, unknown>).lastEscapeTime as number | undefined;

        if (lastEscape && now - lastEscape < 500) {
          // Double Esc detected within 500ms
          console.log('');
          console.log(chalk.cyan('⏪ Initiating rewind...'));
          console.log('');

          // Trigger rewind
          (async () => {
            try {
              // Get current session from the getter
              const currentSession = getSession();
              const rewindedSession = await interactiveRewind(currentSession);
              if (rewindedSession) {
                // Update session reference
                Object.assign(currentSession, rewindedSession);
                await saveSession(currentSession);
                console.log('');
                displaySuccess('Rewind complete!');
              }
            } catch (error) {
              displayError(`Rewind failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            console.log('');
            rl.prompt();
          })().catch(() => {
            // Error already handled
          });

          // Reset escape tracking
          (rl as unknown as Record<string, unknown>).lastEscapeTime = 0;
          return;
        }

        // Store this escape press
        (rl as unknown as Record<string, unknown>).lastEscapeTime = now;
      }

      // Trigger autocomplete when "/" is typed on an empty line
      // The autocomplete function will handle all subsequent typing
      if (key.sequence === '/' && currentLine === '') {
        autocompleteActive = true;
        const selected = await showCommandAutocomplete('/');
        autocompleteActive = false;

        // Always clear the line buffer first
        (rl as unknown as { line: string }).line = '';

        if (selected) {
          // Clear the input line and show the selected command
          process.stdout.write('\r\x1B[K');
          process.stdout.write(colors.tertiary('You: ') + selected);
          process.stdout.write('\n');

          // Execute the selected command immediately
          // Emit 'line' event to trigger command execution
          rl.emit('line', selected);

          // Show prompt for next input
          rl.prompt();
        } else {
          // Show prompt
          rl.prompt(true);
        }
      }
    });
  }
}

export async function chatCommandEnhanced(options: ChatOptions): Promise<void> {
  const config = await getEffectiveConfig();
  const model = options.model || config.defaultModel;
  const workingDir = options.workingDir || process.cwd();

  // Load agent if provided (takes precedence over assistant)
  let agentDefinition = null;
  let agentName = null;
  if (options.agent) {
    const loadedAgent = await loadAgent(options.agent);
    if (!loadedAgent) {
      displayError(`Agent not found: ${options.agent}`);
      process.exit(1);
    }
    agentDefinition = loadedAgent.definition;
    agentName = agentDefinition.metadata.name;
  }

  // Load assistant (if agent not provided)
  const assistant = options.assistant
    ? await getAssistant(options.assistant)
    : await getDefaultAssistant();

  if (!assistant) {
    displayError(`Assistant not found: ${options.assistant}`);
    process.exit(1);
  }

  // Detect project context
  let projectContext = await detectProjectContext(workingDir);

  // If not initialized and tools will be enabled, prompt for permissions
  if (!projectContext.hasOllamaDir && assistant.toolsEnabled) {
    const initialized = await promptForPermissions(workingDir);
    if (initialized) {
      // Reload context after initialization
      projectContext = await detectProjectContext(workingDir);
    }
  }

  // Load PROJECT.md if available
  let projectMdContent: string | null = null;
  if (projectContext.hasProjectMd) {
    projectMdContent = await readProjectMd(workingDir);
  }

  // Use agent/assistant's tools setting if not explicitly overridden
  // Agents have tools enabled by default
  // Also check if project permissions allow tools
  let toolsEnabled = options.tools !== undefined
    ? options.tools
    : (agentDefinition ? true : assistant.toolsEnabled);

  if (toolsEnabled && projectContext.hasOllamaDir) {
    // Check permissions
    if (!projectContext.permissions.canReadFiles) {
      console.log(chalk.yellow('\n⚠  Tools disabled: No read permission for this project'));
      toolsEnabled = false;
    }
  }

  // Load or create session
  let session: ChatSession;
  if (options.session) {
    const loaded = await loadSession(options.session);
    if (loaded) {
      session = loaded;
    } else {
      displayError(`Session "${options.session}" not found. Creating new session.`);
      session = await createSession(model);
    }
  } else {
    session = await createSession(model);
  }

  // Add system message from agent or assistant
  if (session.messages.length === 0) {
    // Use agent system prompt if agent is loaded, otherwise use assistant
    let systemMessage = options.system || (agentDefinition ? getAgentSystemPrompt(agentDefinition) : assistant.systemPrompt);

    // Add project context if available
    if (projectMdContent) {
      systemMessage += `\n\n## Project Context\n\nYou are working on the following project. Use this context to provide more accurate and relevant assistance:\n\n${projectMdContent}`;
    } else if (projectContext.hasOllamaDir) {
      systemMessage += `\n\n## Project Context\n\nWorking directory: ${workingDir}\nProject: ${projectContext.projectName}\n\nNote: No PROJECT.md found. Recommend running 'ollama-cli init' to add project context.`;
    }

    if (toolsEnabled) {
      systemMessage += '\n\n' + getToolsPrompt();
      systemMessage +=
        '\nTo use a tool, respond with a JSON object in the format:\n' +
        '{"tool": "tool_name", "parameters": {...}}\n' +
        'After using a tool, you will receive the results to continue the conversation.';
    }

    await addMessage(session, {
      role: 'system',
      content: systemMessage,
    });
  }

  // Display welcome dashboard
  if (toolsEnabled) {
    displayCodingAssistantWelcome({
      model: session.model,
      sessionId: session.id,
      toolCount: getAllTools().length,
      workingDir,
      assistantName: agentName || assistant.name,
      assistantEmoji: agentName ? '🎯' : assistant.emoji, // Use target emoji for agents
    });
  } else {
    displayWelcome(session.model, session.id);
  }

  // Display agent info if using an agent
  if (agentName) {
    console.log('');
    console.log(colors.brand.primary(`🎯 Using Agent: ${agentName}`));
    if (agentDefinition?.metadata.description) {
      console.log(colors.dim(`   ${agentDefinition.metadata.description}`));
    }
    if (agentDefinition?.metadata.framework) {
      console.log(colors.dim(`   Framework: ${agentDefinition.metadata.framework}`));
    }
    console.log('');
  }

  const client = new OllamaClient(config.baseUrl, config.timeoutMs);

  // Initialize tool executor if tools enabled
  const toolExecutor = toolsEnabled
    ? new ToolExecutor({
        workingDirectory: workingDir,
        sessionId: session.id,
        allowDangerous: true,
        sandboxPaths: [workingDir],
        maxBashTimeout: 60000,
      })
    : null;

  // Helper function to update prompt with mode indicator (for future use)
  // const updatePrompt = (rlInterface: readline.Interface) => {
  //   const mode = getCurrentMode();
  //   const indicator = getModeIndicator(mode);
  //   rlInterface.setPrompt(chalk.cyan(`${indicator} You: `));
  // };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('⏵ You: '), // Initial prompt with normal mode
  });

  // Set up custom keyboard shortcuts
  setupKeyboardShortcuts(rl, () => session);

  let isProcessing = false;
  let isExiting = false;

  rl.prompt();

  rl.on('line', (input: string) => {
    void (async () => {
    const trimmed = input.trim();

    if (trimmed === '') {
      rl.prompt();
      return;
    }

    // Handle Bash Mode (! prefix) - Direct command execution
    if (trimmed.startsWith('!')) {
      const command = trimmed.substring(1).trim();
      if (command) {
        await handleBashMode(command);
      }
      rl.prompt();
      return;
    }

    // Handle Memory Shortcuts (# prefix) - Add to PROJECT.md
    if (trimmed.startsWith('#')) {
      const note = trimmed.substring(1).trim();
      if (note) {
        await handleMemoryShortcut(note);
      }
      rl.prompt();
      return;
    }

    // Handle REPL commands
    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed, session, client, toolExecutor);
      rl.prompt();
      return;
    }

    // Handle user message
    isProcessing = true;
    console.log(''); // Add newline

    // Add user message to session
    await addMessage(session, {
      role: 'user',
      content: trimmed,
    });

    // Stream response
    try {
      displayAssistantMessageStart(assistant?.name);

      let fullResponse = '';
      let isFirstChunk = true;

      // Augment messages with verbose prompt if enabled
      const messagesToSend = augmentMessagesForVerbose(session.messages);

      for await (const chunk of client.chat({
        model: session.model,
        messages: messagesToSend,
      })) {
        const formattedChunk = formatStreamingChunk(chunk, isFirstChunk);
        process.stdout.write(formattedChunk);
        fullResponse += chunk;
        isFirstChunk = false;
      }

      displayAssistantMessageEnd();

      // Update PROJECT.md timestamp if it exists
      await updateProjectTimestamp(process.cwd());

      // Add assistant message to session
      await addMessage(session, {
        role: 'assistant',
        content: fullResponse,
      });

      // Check if response contains tool call (if tools enabled)
      if (toolExecutor && fullResponse.includes('"tool":')) {
        await handleToolCall(fullResponse, session, client, toolExecutor, assistant);
      }
    } catch (error) {
      console.log(''); // Add newline
      if (error instanceof Error) {
        displayError(error.message);
      } else {
        displayError('An unknown error occurred');
      }
    } finally {
      isProcessing = false;
      rl.prompt();
    }
    })();
  });

  rl.on('close', () => {
    void (async () => {
    if (!isProcessing && !isExiting) {
      console.log(chalk.grey('\nGoodbye!'));
      await saveSession(session);
      process.exit(0);
    }
    })();
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    void (async () => {
    if (isProcessing) {
      isExiting = true;
      console.log(chalk.yellow('\n\nInterrupted. Saving session...'));
      await saveSession(session);
      process.exit(0);
    } else {
      isExiting = true;
      await saveSession(session);
      console.log(chalk.grey('\nGoodbye!'));
      rl.close();
      process.exit(0);
    }
    })();
  });
}

/**
 * Handle tool call from LLM response
 */
async function handleToolCall(
  response: string,
  session: ChatSession,
  client: OllamaClient,
  toolExecutor: ToolExecutor,
  assistant?: { name: string; emoji: string } | undefined
): Promise<void> {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[^{}]*"tool"[^{}]*\}/);
    if (!jsonMatch) {
      return;
    }

    const toolCall = JSON.parse(jsonMatch[0]) as ToolCallRequest;
    toolCall.sessionId = session.id;

    displayToolExecutionStart(toolCall.tool, toolCall.parameters);

    const result = await toolExecutor.execute(toolCall);

    if (result.success) {
      const summary = summarizeToolResult(result.data);
      displayToolExecutionSuccess(summary, result.snapshotId);

      // Add tool result to conversation (full data for LLM, but we showed summary to user)
      await addMessage(session, {
        role: 'user',
        content: `Tool result:\n${JSON.stringify(result.data, null, 2)}`,
      });

      // Get LLM's response to tool result
      displayThinking();

      let fullResponse = '';
      let isFirstChunk = true;

      // Augment messages with verbose prompt if enabled
      const messagesToSend2 = augmentMessagesForVerbose(session.messages);

      for await (const chunk of client.chat({
        model: session.model,
        messages: messagesToSend2,
      })) {
        if (isFirstChunk) {
          clearThinking();
          displayAssistantMessageStart(assistant?.name);
        }
        const formattedChunk = formatStreamingChunk(chunk, isFirstChunk);
        process.stdout.write(formattedChunk);
        fullResponse += chunk;
        isFirstChunk = false;
      }

      displayAssistantMessageEnd();

      // Update PROJECT.md timestamp if it exists
      await updateProjectTimestamp(process.cwd());

      await addMessage(session, {
        role: 'assistant',
        content: fullResponse,
      });
    } else {
      displayToolExecutionFailure(result.error || 'Unknown error');
    }
  } catch (error) {
    console.log(chalk.yellow('Could not parse tool call'));
  }
}

/**
 * Handle Bash Mode - Direct command execution with ! prefix
 */
async function handleBashMode(command: string): Promise<void> {
  try {
    displayInfo(`Executing: ${command}`);
    console.log('');

    const { execAsync } = await import('../utils/exec.js');
    const result = await execAsync(command);

    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.log(chalk.yellow(result.stderr));
    }

    displaySuccess(`Command completed (exit code: ${result.code || 0})`);
  } catch (error) {
    displayError(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');
}

/**
 * Handle Memory Shortcuts - Add note to PROJECT.md with # prefix
 */
async function handleMemoryShortcut(note: string): Promise<void> {
  try {
    const projectMdPath = path.join(process.cwd(), 'PROJECT.md');

    // Check if PROJECT.md exists
    try {
      await fs.access(projectMdPath);
    } catch {
      displayError('PROJECT.md not found in current directory');
      console.log('');
      console.log(colors.secondary('Initialize a project first with:'));
      console.log(colors.tertiary('  ollama-cli init'));
      console.log('');
      return;
    }

    // Read current content
    let content = await fs.readFile(projectMdPath, 'utf-8');

    // Find or create "Notes" section
    const notesHeader = '\n## Notes\n\n';
    const notesRegex = /\n## Notes\n/;

    const timestamp = new Date().toISOString().split('T')[0];
    const noteEntry = `- **${timestamp}**: ${note}\n`;

    if (notesRegex.test(content)) {
      // Add to existing Notes section
      content = content.replace(notesRegex, `${notesHeader}${noteEntry}`);
    } else {
      // Create Notes section before footer
      const footerRegex = /\n---\n/;
      if (footerRegex.test(content)) {
        content = content.replace(footerRegex, `${notesHeader}${noteEntry}\n---\n`);
      } else {
        // Add at end
        content = content.trimEnd() + `\n${notesHeader}${noteEntry}`;
      }
    }

    await fs.writeFile(projectMdPath, content, 'utf-8');
    displaySuccess(`Added to PROJECT.md: "${note}"`);
  } catch (error) {
    displayError(`Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');
}

/**
 * Handle REPL commands
 */
async function handleCommand(
  command: string,
  session: ChatSession,
  client: OllamaClient,
  toolExecutor: ToolExecutor | null
): Promise<void> {
  const parts = command.slice(1).split(' ');
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      displayEnhancedHelp(toolExecutor !== null);
      break;

    case 'tools':
      if (!toolExecutor) {
        displayError('Tools not enabled. Restart with --tools flag');
      } else {
        displayToolsList();
      }
      break;

    case 'models':
      try {
        startSpinner('Fetching models...');
        const response = await client.listModels();
        stopSpinner();
        console.log('');
        displayModels(response.models);
      } catch (error) {
        stopSpinner();
        if (error instanceof Error) {
          displayError(error.message);
        }
      }
      break;

    case 'clear':
    case 'clean':
      console.clear();
      await clearMessages(session);
      displaySuccess('Conversation history cleared');
      break;

    case 'new': {
      console.clear();
      // Save current session
      await saveSession(session);
      // Create new session
      const newSession = await createSession(session.model);
      Object.assign(session, newSession);
      displaySuccess('Started new conversation');
      console.log(chalk.grey(`  Session ID: ${session.id}`));
      break;
    }

    case 'save':
      if (args.length > 0) {
        session.name = args.join(' ');
      }
      await saveSession(session);
      displaySuccess(
        session.name
          ? `Session saved as: ${session.name} (${session.id})`
          : `Session saved: ${session.id}`
      );
      break;

    case 'load':
      if (args.length === 0) {
        displayError('Usage: /load <session-id>');
      } else {
        const sessionId = args[0]!;
        const loaded = await loadSession(sessionId);
        if (loaded) {
          Object.assign(session, loaded);
          displaySuccess(`Loaded session: ${sessionId}`);
        } else {
          displayError(`Session "${sessionId}" not found`);
        }
      }
      break;

    case 'snapshots':
    case 'history':
      await displaySnapshotHistory(session.id);
      break;

    case 'diff':
      if (args.length === 0) {
        displayError('Usage: /diff <snapshot-id> [previous-snapshot-id]');
      } else {
        await displaySnapshotDiff(args[0]!, args[1]);
      }
      break;

    case 'revert':
      if (args.length === 0) {
        displayError('Usage: /revert <snapshot-id>');
      } else {
        await performRevert(args[0]!);
      }
      break;

    case 'undo':
      await performUndo(session.id);
      break;

    case 'cleanup':
      await performCleanup();
      break;

    case 'template': {
      if (args.length === 0) {
        displayError('Usage: /template <name> [key=value...]');
        console.log('');
        console.log(colors.secondary('Example:'));
        console.log(`  ${colors.tertiary('/template code-review filename=app.ts language=typescript')}`);
        console.log('');
        console.log(colors.secondary('List templates:'));
        console.log(`  ${colors.tertiary('ollama-cli template list')}`);
      } else {
        await handleTemplateCommand(args);
      }
      break;
    }

    case 'export': {
      const format = (args[0] || 'markdown') as ExportFormat;
      const filename = args[1];

      if (!['json', 'markdown', 'txt'].includes(format)) {
        displayError('Invalid format. Use: json, markdown, or txt');
        break;
      }

      try {
        const filePath = await exportSession(session, format, filename);
        displaySuccess(`Exported to: ${filePath}`);
      } catch (error) {
        displayError(
          error instanceof Error ? error.message : 'Failed to export'
        );
      }
      break;
    }

    case 'commit': {
      const style = (args[0] || 'conventional') as CommitStyle;
      await handleCommitCommand(session, client, style);
      break;
    }

    case 'review': {
      await handleReviewCommand(session, client);
      break;
    }

    case 'plan': {
      if (args.length === 0) {
        displayError('Usage: /plan <task-description>');
        console.log('');
        console.log(colors.secondary('Example:'));
        console.log(`  ${colors.tertiary('/plan Add user authentication with JWT')}`);
        console.log('');
        console.log(colors.secondary('Or use:'));
        console.log(`  ${colors.tertiary('/plans - List all plans')}`);
      } else {
        await handlePlanCommand(session, client, args.join(' '));
      }
      break;
    }

    case 'plans': {
      await handleListPlansCommand();
      break;
    }

    case 'index': {
      if (args.length === 0) {
        displayError('Usage: /index build|rebuild|stats');
        displayInfo('Build searchable codebase index for better context');
      } else {
        const { indexCommand } = await import('./index-cmd.js');
        await indexCommand(args[0] as 'build' | 'rebuild' | 'stats', args.slice(1));
      }
      break;
    }

    case 'search': {
      if (args.length === 0) {
        displayError('Usage: /search <symbol-name> [--type function|class|interface]');
        displayInfo('Search codebase index for symbols');
      } else {
        await handleSearchCommand(args);
      }
      break;
    }

    case 'test': {
      displayInfo('Running tests...');
      await handleTestCommand(session, client);
      break;
    }

    case 'snippet': {
      await handleSnippetCommand(args, session);
      break;
    }

    case 'context': {
      await handleContextCommand(args, session);
      break;
    }

    case 'branch': {
      await handleBranchCommand(args, session);
      break;
    }

    case 'stats':
      if (toolExecutor) {
        displayToolStats(toolExecutor);
      } else {
        displayError('Tools not enabled');
      }
      break;

    case 'exit':
    case 'quit':
      await saveSession(session);
      console.log(chalk.grey('\nGoodbye!'));
      process.exit(0);
      // No break needed as process.exit() terminates
      // eslint-disable-next-line no-fallthrough
    default: {
      // Try to find similar commands
      const { filterCommands } = await import('../utils/command-autocomplete.js');
      const suggestions = filterCommands(`/${cmd}`);

      if (suggestions.length > 0) {
        displayError(`Unknown command: /${cmd}`);
        console.log('');
        console.log(colors.secondary('Did you mean:'));
        // Show up to 5 suggestions
        const topSuggestions = suggestions.slice(0, 5);
        for (const suggestion of topSuggestions) {
          console.log(`  ${colors.brand.primary(suggestion.command)} - ${colors.dim(suggestion.description)}`);
        }
        if (suggestions.length > 5) {
          console.log(colors.dim(`  ... and ${suggestions.length - 5} more (type /help to see all)`));
        }
        console.log('');
      } else {
        displayError(`Unknown command: /${cmd}`, 'Type /help to see available commands');
      }
      break;
    }
  }
}

/**
 * Handle test command
 */
async function handleTestCommand(session: ChatSession, client: OllamaClient): Promise<void> {
  const { runTests } = await import('../testing/runner.js');

  try {
    startSpinner('Running tests...');
    const result = await runTests(process.cwd(), { framework: 'auto' });
    stopSpinner();

    console.log('');
    console.log(gradients.brand('Test Results'));
    console.log('');

    const icon = result.failed > 0 ? '❌' : '✅';
    console.log(`${icon} ${colors.brand.primary(`${result.passed}/${result.total} tests passed`)} ${colors.dim(`(${result.duration}ms)`)}`);

    if (result.skipped > 0) {
      console.log(colors.tertiary(`   ${result.skipped} skipped`));
    }

    if (result.failed > 0) {
      console.log('');
      console.log(colors.error(`${result.failed} test${result.failed > 1 ? 's' : ''} failed:`));
      console.log('');

      for (let i = 0; i < Math.min(result.failures.length, 5); i++) {
        const failure = result.failures[i]!;
        console.log(colors.secondary(`  ${i + 1}. ${failure.test}`));
        console.log(`     ${colors.error(failure.error.split('\n')[0]!)}`);
      }

      if (result.failures.length > 5) {
        console.log(colors.dim(`\n   ... and ${result.failures.length - 5} more`));
      }

      console.log('');
      console.log(colors.tertiary('Asking AI to analyze failures...'));

      // Add test failures to session for AI analysis
      const failuresSummary = result.failures
        .slice(0, 3)
        .map((f, i) => `${i + 1}. ${f.test}\n   Error: ${f.error}`)
        .join('\n\n');

      await addMessage(session, {
        role: 'user',
        content: `I ran tests and ${result.failed} failed. Here are the failures:\n\n${failuresSummary}\n\nCan you help me understand what's wrong and how to fix it?`,
      });

      // Stream AI response
      displayAssistantMessageStart();
      let fullResponse = '';

      for await (const chunk of client.chat({
        model: session.model,
        messages: session.messages,
      })) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }

      console.log('');

      await addMessage(session, {
        role: 'assistant',
        content: fullResponse,
      });

      displayAssistantMessageEnd();

      // Update PROJECT.md timestamp if it exists
      await updateProjectTimestamp(process.cwd());
    } else {
      console.log('');
      console.log(colors.success('All tests passed!'));
      console.log('');
    }
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Failed to run tests');
  }
}

/**
 * Handle search command
 */
async function handleSearchCommand(args: string[]): Promise<void> {
  const { loadIndex, searchSymbols } = await import('../indexing/index.js');

  try {
    const index = await loadIndex();
    if (!index) {
      displayError('No index found', 'Run: /index build');
      return;
    }

    const query = args[0]!;
    const results = searchSymbols(index, query, { limit: 10 });

    if (results.length === 0) {
      displayInfo(`No symbols found matching: ${query}`);
      return;
    }

    console.log('');
    console.log(gradients.brand(`Search Results: ${query}`));
    console.log('');

    for (const result of results) {
      const { symbol, score } = result;
      const scorePercent = Math.round(score * 100);
      const icon =
        symbol.type === 'function' ? '𝑓' :
        symbol.type === 'class' ? 'C' :
        symbol.type === 'interface' ? 'I' :
        symbol.type === 'type' ? 'T' :
        'V';

      console.log(`${colors.brand.primary(icon)} ${colors.secondary(symbol.name)} ${colors.dim(`(${scorePercent}% match)`)}`);
      console.log(`   ${colors.tertiary(symbol.file)}:${symbol.line}`);
      if (symbol.signature) {
        console.log(`   ${colors.dim(symbol.signature)}`);
      }
      console.log('');
    }

    console.log(colors.dim(`Found ${results.length} symbol${results.length > 1 ? 's' : ''}`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to search');
  }
}

/**
 * Display enhanced help
 */
function displayEnhancedHelp(toolsEnabled: boolean): void {
  console.log('');
  console.log(gradients.brand('Available Commands'));
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Session Management`));
  console.log('');
  console.log(`  ${colors.brand.primary('/new')}           ${colors.tertiary('Start new conversation')}`);
  console.log(`  ${colors.brand.primary('/clear')}         ${colors.tertiary('Clear history')}`);
  console.log(`  ${colors.brand.primary('/save [name]')}   ${colors.tertiary('Save session')}`);
  console.log(`  ${colors.brand.primary('/load <id>')}     ${colors.tertiary('Load session')}`);
  console.log(`  ${colors.brand.primary('/exit')}          ${colors.tertiary('Exit chat')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Special Shortcuts`));
  console.log('');
  console.log(`  ${colors.brand.primary('!<command>')}     ${colors.tertiary('Bash mode - direct command execution')}`);
  console.log(`  ${colors.brand.primary('#<note>')}        ${colors.tertiary('Add note to PROJECT.md memory')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Keyboard Shortcuts`));
  console.log('');
  console.log(`  ${colors.brand.primary('Shift+Tab')}      ${colors.tertiary('Cycle permission modes (⏵ → ⏵⏵ → ⏸)')}`);
  console.log(`  ${colors.brand.primary('Ctrl+O')}         ${colors.tertiary('Toggle verbose mode (extended thinking)')}`);
  console.log(`  ${colors.brand.primary('Ctrl+Y')}         ${colors.tertiary('Cycle output styles (Default → Minimal → Markdown → JSON)')}`);
  console.log(`  ${colors.brand.primary('Esc+Esc')}        ${colors.tertiary('⏪ Rewind code and conversation')}`);
  console.log(`  ${colors.brand.primary('Ctrl+K/L')}       ${colors.tertiary('Clear screen')}`);
  console.log(`  ${colors.brand.primary('Ctrl+U')}         ${colors.tertiary('Clear current line')}`);
  console.log('');

  if (toolsEnabled) {
    console.log(colors.secondary(`${symbols.circle} Tools & Operations`));
    console.log('');
    console.log(`  ${colors.brand.primary('/tools')}         ${colors.tertiary('List all tools')}`);
    console.log(`  ${colors.brand.primary('/stats')}         ${colors.tertiary('Tool usage stats')}`);
    console.log('');
  }

  console.log(colors.secondary(`${symbols.circle} Snapshots & Undo`));
  console.log('');
  console.log(`  ${colors.brand.primary('/undo')}          ${colors.tertiary('Undo last change')}`);
  console.log(`  ${colors.brand.primary('/snapshots')}     ${colors.tertiary('List snapshots')}`);
  console.log(`  ${colors.brand.primary('/diff <id>')}     ${colors.tertiary('Show differences')}`);
  console.log(`  ${colors.brand.primary('/revert <id>')}   ${colors.tertiary('Revert to snapshot')}`);
  console.log(`  ${colors.brand.primary('/cleanup')}       ${colors.tertiary('Clean old snapshots')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Templates & Export`));
  console.log('');
  console.log(`  ${colors.brand.primary('/template <name>')} ${colors.tertiary('Use prompt template')}`);
  console.log(`  ${colors.brand.primary('/export [format]')} ${colors.tertiary('Export conversation')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Prompt Library`));
  console.log('');
  console.log(`  ${colors.brand.primary('/snippet save')}     ${colors.tertiary('Save prompt snippet')}`);
  console.log(`  ${colors.brand.primary('/snippet list')}     ${colors.tertiary('List all snippets')}`);
  console.log(`  ${colors.brand.primary('/snippet use')}      ${colors.tertiary('Use a snippet')}`);
  console.log(`  ${colors.brand.primary('/snippet delete')}   ${colors.tertiary('Delete snippet')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Context Management`));
  console.log('');
  console.log(`  ${colors.brand.primary('/context budget')}   ${colors.tertiary('Set token budget')}`);
  console.log(`  ${colors.brand.primary('/context stats')}    ${colors.tertiary('Show context stats')}`);
  console.log(`  ${colors.brand.primary('/context reset')}    ${colors.tertiary('Reset context config')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Branching`));
  console.log('');
  console.log(`  ${colors.brand.primary('/branch create')}    ${colors.tertiary('Fork conversation')}`);
  console.log(`  ${colors.brand.primary('/branch list')}      ${colors.tertiary('List all branches')}`);
  console.log(`  ${colors.brand.primary('/branch switch')}    ${colors.tertiary('Switch branches')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Planning`));
  console.log('');
  console.log(`  ${colors.brand.primary('/plan <task>')}     ${colors.tertiary('Create implementation plan')}`);
  console.log(`  ${colors.brand.primary('/plans')}           ${colors.tertiary('List all plans')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Codebase Indexing`));
  console.log('');
  console.log(`  ${colors.brand.primary('/index build')}     ${colors.tertiary('Build codebase index')}`);
  console.log(`  ${colors.brand.primary('/index stats')}     ${colors.tertiary('Show index statistics')}`);
  console.log(`  ${colors.brand.primary('/search <name>')}   ${colors.tertiary('Search for symbols')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Testing`));
  console.log('');
  console.log(`  ${colors.brand.primary('/test')}            ${colors.tertiary('Run tests with AI analysis')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Git Workflow`));
  console.log('');
  console.log(`  ${colors.brand.primary('/commit [style]')}  ${colors.tertiary('Generate commit message')}`);
  console.log(`  ${colors.brand.primary('/review')}          ${colors.tertiary('Review staged changes')}`);
  console.log('');

  console.log(colors.secondary(`${symbols.circle} Other`));
  console.log('');
  console.log(`  ${colors.brand.primary('/help')}            ${colors.tertiary('Show this help')}`);
  console.log(`  ${colors.brand.primary('/models')}          ${colors.tertiary('List models')}`);
  console.log('');
}

/**
 * Display tools list
 */
function displayToolsList(): void {
  const tools = getAllTools();
  console.log(chalk.bold.cyan(`\nAvailable Tools (${tools.length}):`));
  console.log(chalk.grey('─'.repeat(60)));

  for (const tool of tools) {
    const danger = tool.dangerous ? chalk.red(' ⚠️ ') : '   ';
    console.log(chalk.white(`${danger}${tool.name}`));
    console.log(chalk.grey(`      ${tool.description}`));
  }
  console.log(chalk.grey('─'.repeat(60)) + '\n');
}

/**
 * Display snapshot history
 */
async function displaySnapshotHistory(sessionId: string): Promise<void> {
  const snapshots = await listSnapshots(sessionId);

  if (snapshots.length === 0) {
    console.log(chalk.yellow('\nNo snapshots found for this session\n'));
    return;
  }

  console.log(chalk.bold.cyan(`\nSnapshot History (${snapshots.length}):`));
  console.log(chalk.grey('─'.repeat(60)));

  for (const snapshot of snapshots.slice(0, 10)) {
    const date = new Date(snapshot.timestamp).toLocaleString();
    console.log(chalk.white(`ID: ${snapshot.id.substring(0, 8)}...`));
    console.log(chalk.grey(`  Time: ${date}`));
    console.log(chalk.grey(`  Reason: ${snapshot.reason}`));
    console.log(chalk.grey(`  Files: ${snapshot.fileCount}`));
    console.log('');
  }

  if (snapshots.length > 10) {
    console.log(chalk.grey(`... and ${snapshots.length - 10} more\n`));
  }
}

/**
 * Display snapshot diff
 */
async function displaySnapshotDiff(snapshotId: string, previousId?: string): Promise<void> {
  try {
    const diff = await compareSnapshots(snapshotId, previousId);
    console.log('\n' + formatFullDiff(diff));
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to generate diff');
  }
}

/**
 * Perform revert
 */
async function performRevert(snapshotId: string): Promise<void> {
  try {
    const snapshot = await loadSnapshot(snapshotId);
    if (!snapshot) {
      displayError(`Snapshot not found: ${snapshotId}`);
      return;
    }

    console.log(chalk.yellow('\nReverting to snapshot:'));
    console.log(chalk.grey(`  ID: ${snapshotId}`));
    console.log(chalk.grey(`  Time: ${new Date(snapshot.timestamp).toLocaleString()}`));
    console.log(chalk.grey(`  Files: ${snapshot.files.length}`));

    const result = await revertToSnapshot({
      snapshotId,
      createBackup: true,
    });

    if (result.success) {
      displaySuccess(`Reverted ${result.filesReverted.length} file(s)`);
    } else {
      displayError(`Failed to revert some files (${result.errors.length} errors)`);
      for (const error of result.errors) {
        console.log(chalk.red(`  ${error.file}: ${error.error}`));
      }
    }
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to revert');
  }
}

/**
 * Perform undo (revert to most recent snapshot)
 */
async function performUndo(sessionId: string): Promise<void> {
  try {
    const snapshots = await listSnapshots(sessionId);

    if (snapshots.length === 0) {
      console.log(chalk.yellow('\nNo snapshots available to undo'));
      console.log(chalk.grey('  Snapshots are created automatically when files are modified'));
      return;
    }

    // Get most recent snapshot
    const latestSnapshot = snapshots[snapshots.length - 1]!;

    console.log(chalk.cyan('\nUndoing last change:'));
    console.log(chalk.grey(`  Snapshot: ${latestSnapshot.id.substring(0, 8)}...`));
    console.log(chalk.grey(`  Created: ${new Date(latestSnapshot.timestamp).toLocaleString()}`));
    console.log(chalk.grey(`  Reason: ${latestSnapshot.reason}`));

    const snapshot = await loadSnapshot(latestSnapshot.id);
    if (!snapshot) {
      displayError('Snapshot not found');
      return;
    }

    const result = await revertToSnapshot({
      snapshotId: latestSnapshot.id,
      createBackup: true,
    });

    if (result.success) {
      displaySuccess(`Undone! Reverted ${result.filesReverted.length} file(s)`);
      console.log(chalk.grey('\nTip: Use /snapshots to see all changes'));
    } else {
      displayError(`Failed to undo some files (${result.errors.length} errors)`);
      for (const error of result.errors) {
        console.log(chalk.red(`  ${error.file}: ${error.error}`));
      }
    }
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to undo');
  }
}

/**
 * Perform cleanup
 */
async function performCleanup(): Promise<void> {
  try {
    const deleted = await cleanOldSnapshots(10);
    displaySuccess(`Cleaned up ${deleted} old snapshot(s)`);
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to cleanup');
  }
}

/**
 * Display tool statistics
 */
function displayToolStats(executor: ToolExecutor): void {
  const stats = executor.getUsageStats();

  console.log(chalk.bold.cyan('\nTool Usage Statistics:'));
  console.log(chalk.grey('─'.repeat(60)));
  console.log(chalk.white(`Total calls: ${stats.totalCalls}`));
  console.log(
    chalk.white(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`)
  );

  if (Object.keys(stats.toolUsage).length > 0) {
    console.log(chalk.white('\nTool breakdown:'));
    for (const [tool, count] of Object.entries(stats.toolUsage)) {
      console.log(chalk.grey(`  ${tool}: ${count}`));
    }
  }
  console.log('');
}

/**
 * Handle /template command in REPL
 */
async function handleTemplateCommand(args: string[]): Promise<void> {
  try {
    const templateName = args[0];
    if (!templateName) {
      displayError('Template name required');
      return;
    }

    const template = await getTemplate(templateName);
    if (!template) {
      displayError(`Template not found: ${templateName}`);
      console.log('');
      console.log(colors.secondary('List templates:'));
      console.log(`  ${colors.tertiary('ollama-cli template list')}`);
      console.log('');
      return;
    }

    // Parse variables from remaining args
    const variables = parseVariables(args.slice(1));

    // Check if all required variables are provided
    const missingVars = template.variables.filter((v) => !(v in variables));

    if (missingVars.length > 0) {
      displayError(`Missing variables: ${missingVars.join(', ')}`);
      console.log('');
      console.log(colors.secondary('Usage:'));
      console.log(
        `  ${colors.tertiary(`/template ${templateName} ${template.variables.map((v) => `${v}=value`).join(' ')}`)}`
      );
      console.log('');
      return;
    }

    // Render template
    const rendered = renderTemplate(template, variables);

    // Display as user message
    console.log('');
    displayUserMessage(rendered);
    console.log('');

    displaySuccess('Template rendered. You can now send this as your message.');
    console.log(colors.tertiary('Tip: Press Enter to send, or edit first'));
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to use template'
    );
  }
}

/**
 * Handle /commit command in REPL
 */
async function handleCommitCommand(
  session: ChatSession,
  client: OllamaClient,
  style: CommitStyle
): Promise<void> {
  try {
    // Check if in git repo
    const isGit = await isGitRepository();
    if (!isGit) {
      displayError('Not a git repository');
      return;
    }

    // Get staged diff
    const diff = await getStagedDiff();

    if (!diff || diff.trim() === '') {
      displayError('No staged changes found');
      console.log('');
      console.log(colors.secondary('Stage files first:'));
      console.log(`  ${colors.tertiary('git add <files>')}`);
      console.log('');
      return;
    }

    const styleGuide =
      style === 'conventional'
        ? GIT_TEMPLATES.COMMIT_MESSAGE_CONVENTIONAL
        : GIT_TEMPLATES.COMMIT_MESSAGE_SIMPLE;

    // Build prompt
    const prompt = GIT_TEMPLATES.COMMIT_MESSAGE.replace('{{diff}}', diff)
      .replace(/\{\{style\}\}/g, style)
      .replace('{{styleGuide}}', styleGuide);

    console.log('');
    console.log(gradients.brand('Generating Commit Message'));
    console.log('');
    console.log(colors.secondary('Analyzing staged changes...'));
    console.log('');

    // Add message to session
    await addMessage(session, {
      role: 'user',
      content: 'Generate a commit message for my staged changes.',
    });

    let fullResponse = '';

    for await (const chunk of client.chat({
      model: session.model,
      messages: [
        ...session.messages,
        {
          role: 'user',
          content: prompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    console.log('\n');

    // Add assistant response to session
    await addMessage(session, {
      role: 'assistant',
      content: fullResponse,
    });

    console.log(colors.tertiary('Copy the message above to use for your commit'));
    console.log(colors.secondary('To commit:'));
    console.log(`  ${colors.brand.primary('git commit -m "<message>"')}`);
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to generate commit message'
    );
  }
}

/**
 * Handle /review command in REPL
 */
async function handleReviewCommand(
  session: ChatSession,
  client: OllamaClient
): Promise<void> {
  try {
    // Check if in git repo
    const isGit = await isGitRepository();
    if (!isGit) {
      displayError('Not a git repository');
      return;
    }

    // Get staged diff
    const diff = await getStagedDiff();

    if (!diff || diff.trim() === '') {
      displayError('No staged changes found');
      console.log('');
      console.log(colors.secondary('Stage files first:'));
      console.log(`  ${colors.tertiary('git add <files>')}`);
      console.log('');
      return;
    }

    // Build prompt
    const prompt = GIT_TEMPLATES.CODE_REVIEW.replace('{{diff}}', diff);

    console.log('');
    console.log(gradients.brand('Code Review'));
    console.log('');
    console.log(colors.secondary('Reviewing staged changes...'));
    console.log('');

    // Add message to session
    await addMessage(session, {
      role: 'user',
      content: 'Review my staged changes.',
    });

    let fullResponse = '';

    for await (const chunk of client.chat({
      model: session.model,
      messages: [
        ...session.messages,
        {
          role: 'user',
          content: prompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    console.log('\n');

    // Add assistant response to session
    await addMessage(session, {
      role: 'assistant',
      content: fullResponse,
    });
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to review changes'
    );
  }
}

/**
 * Handle /plan command in REPL
 */
async function handlePlanCommand(
  session: ChatSession,
  client: OllamaClient,
  taskDescription: string
): Promise<void> {
  try {
    console.log('');
    console.log(gradients.brand('Creating Plan'));
    console.log('');
    console.log(colors.secondary('Analyzing task complexity...'));
    console.log('');

    const detection = shouldTriggerPlanning(taskDescription);

    console.log(
      `${colors.tertiary(`Complexity: ${detection.confidence} confidence`)}`
    );
    console.log(`${colors.tertiary(`Reason: ${detection.reason}`)}`);
    console.log('');

    // Create plan
    const plan = await createPlan({
      name: taskDescription.substring(0, 50) + (taskDescription.length > 50 ? '...' : ''),
      description: taskDescription,
      userRequest: taskDescription,
      sessionId: session.id,
      workingDirectory: process.cwd(),
      model: session.model,
    });

    console.log(colors.success('Plan created!'));
    console.log('');
    console.log(colors.secondary('Plan Details:'));
    console.log(`  ${colors.tertiary(`ID: ${plan.id.substring(0, 8)}...`)}`);
    console.log(`  ${colors.tertiary(`Name: ${plan.name}`)}`);
    console.log('');

    // Ask LLM to break down into steps
    console.log(colors.secondary('Generating implementation steps...'));
    console.log('');

    const planningPrompt = `Break down this task into implementation steps:

Task: ${taskDescription}

Create a detailed plan with:
1. Exploration steps (analyze existing code)
2. Implementation steps (create/modify files)
3. Testing steps

For each step, specify:
- Title (brief, action-oriented)
- Description (detailed explanation)
- Type (explore, create, modify, delete, execute, test)
- Estimated complexity (low, medium, high)
- Files involved (if applicable)

Format as a numbered list.`;

    await addMessage(session, {
      role: 'user',
      content: 'Create a plan for: ' + taskDescription,
    });

    let fullResponse = '';

    for await (const chunk of client.chat({
      model: session.model,
      messages: [
        ...session.messages,
        {
          role: 'system',
          content:
            'You are a software architect creating implementation plans. Be specific and actionable.',
        },
        {
          role: 'user',
          content: planningPrompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    console.log('\n');

    await addMessage(session, {
      role: 'assistant',
      content: fullResponse,
    });

    console.log(colors.success('Plan steps generated!'));
    console.log('');
    console.log(colors.secondary('Next Steps:'));
    console.log(`  ${colors.brand.primary(`ollama-cli plan show ${plan.id.substring(0, 8)}...`)} - View full plan`);
    console.log(`  ${colors.tertiary('Plan saved to: ~/.ollama-cli/plans/' + plan.id + '.md')}`);
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to create plan'
    );
  }
}

/**
 * Handle /plans command in REPL
 */
async function handleListPlansCommand(): Promise<void> {
  try {
    const plans = await listPlans();

    if (plans.length === 0) {
      displayInfo('No plans found');
      console.log('');
      console.log(colors.secondary('Create a plan:'));
      console.log(`  ${colors.tertiary('/plan <task-description>')}`);
      console.log('');
      return;
    }

    console.log('');
    console.log(gradients.brand('Execution Plans'));
    console.log('');

    for (const plan of plans.slice(0, 5)) {
      const statusIcon =
        plan.status === 'completed' ? '✅' :
        plan.status === 'in-progress' ? '🔄' :
        plan.status === 'approved' ? '👍' :
        plan.status === 'cancelled' ? '❌' :
        '📝';

      const progress = `${plan.completedSteps}/${plan.totalSteps}`;

      console.log(`${statusIcon} ${colors.brand.primary(plan.name)}`);
      console.log(`   ${colors.tertiary(plan.description)}`);
      console.log(
        `   ${colors.dim(`ID: ${plan.id.substring(0, 8)}... | ${plan.status} | ${progress}`)}`
      );
      console.log('');
    }

    if (plans.length > 5) {
      console.log(colors.tertiary(`... and ${plans.length - 5} more`));
      console.log('');
    }

    console.log(colors.secondary('Commands:'));
    console.log(`  ${colors.brand.primary('ollama-cli plan list')} - View all plans`);
    console.log(`  ${colors.brand.primary('ollama-cli plan show <id>')} - View plan details`);
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to list plans'
    );
  }
}

/**
 * Handle /snippet command in REPL
 */
async function handleSnippetCommand(
  args: string[],
  session: ChatSession
): Promise<void> {
  const {
    createPrompt,
    listPrompts,
    getPrompt,
    deletePrompt,
    renderPrompt,
    incrementPromptUsage,
    searchPrompts,
  } = await import('../prompts/index.js');

  const subCommand = args[0]?.toLowerCase();

  try {
    switch (subCommand) {
      case 'save': {
        // /snippet save <name> <content> [--description "desc"] [--category cat]
        if (args.length < 3) {
          displayError('Usage: /snippet save <name> <content> [--description "desc"]');
          console.log('');
          console.log(colors.secondary('Example:'));
          console.log(colors.tertiary('  /snippet save refactor "Refactor {{file}} to use {{pattern}}"'));
          console.log('');
          return;
        }

        const name = args[1]!;
        const content = args[2]!;

        // Parse optional flags
        const descIndex = args.indexOf('--description');
        const catIndex = args.indexOf('--category');
        const description = descIndex !== -1 ? args[descIndex + 1] || '' : '';
        const category = catIndex !== -1 ? args[catIndex + 1] : undefined;

        const prompt = await createPrompt(name, content, description, category);

        displaySuccess(`Prompt snippet "${name}" saved!`);
        console.log('');
        if (prompt.variables.length > 0) {
          console.log(colors.secondary('Variables:'));
          for (const variable of prompt.variables) {
            console.log(`  ${colors.brand.primary(`{{${variable.name}}}`)} ${colors.dim('(required)')}`);
          }
          console.log('');
        }
        console.log(colors.tertiary(`Use: /snippet use ${name} ${prompt.variables.map(v => `${v.name}=value`).join(' ')}`));
        console.log('');
        break;
      }

      case 'list': {
        const prompts = await listPrompts();

        if (prompts.length === 0) {
          displayInfo('No prompt snippets found');
          console.log('');
          console.log(colors.secondary('Create one:'));
          console.log(colors.tertiary('  /snippet save <name> <content>'));
          console.log('');
          return;
        }

        console.log('');
        console.log(gradients.brand('Prompt Snippets'));
        console.log('');

        for (const prompt of prompts) {
          console.log(`${colors.brand.primary(prompt.name)} ${colors.dim(`(used ${prompt.usageCount}x)`)}`);
          console.log(`  ${colors.tertiary(prompt.description || 'No description')}`);
          if (prompt.variables.length > 0) {
            console.log(`  ${colors.dim(`Variables: ${prompt.variables.map(v => v.name).join(', ')}`)}`);
          }
          console.log('');
        }

        console.log(colors.secondary('Commands:'));
        console.log(`  ${colors.brand.primary('/snippet use <name>')} - Use a snippet`);
        console.log(`  ${colors.brand.primary('/snippet delete <name>')} - Delete a snippet`);
        console.log('');
        break;
      }

      case 'use': {
        if (args.length < 2) {
          displayError('Usage: /snippet use <name> [key=value...]');
          console.log('');
          return;
        }

        const name = args[1]!;
        const prompt = await getPrompt(name);

        if (!prompt) {
          displayError(`Prompt snippet not found: ${name}`);
          console.log('');
          console.log(colors.secondary('List snippets:'));
          console.log(colors.tertiary('  /snippet list'));
          console.log('');
          return;
        }

        // Parse key=value pairs
        const variables: Record<string, string> = {};
        for (let i = 2; i < args.length; i++) {
          const arg = args[i]!;
          const [key, ...valueParts] = arg.split('=');
          if (key && valueParts.length > 0) {
            variables[key] = valueParts.join('=');
          }
        }

        // Check for missing required variables
        const missing = prompt.variables
          .filter(v => v.required && !variables[v.name])
          .map(v => v.name);

        if (missing.length > 0) {
          displayError(`Missing required variables: ${missing.join(', ')}`);
          console.log('');
          console.log(colors.secondary('Usage:'));
          console.log(colors.tertiary(`  /snippet use ${name} ${prompt.variables.map(v => `${v.name}=value`).join(' ')}`));
          console.log('');
          return;
        }

        // Render and add to session
        const rendered = renderPrompt(prompt, { variables });

        await addMessage(session, {
          role: 'user',
          content: rendered,
        });

        // Increment usage count
        await incrementPromptUsage(name);

        console.log('');
        displayUserMessage(rendered);
        console.log('');
        displaySuccess('Snippet added to conversation');
        console.log('');
        break;
      }

      case 'delete': {
        if (args.length < 2) {
          displayError('Usage: /snippet delete <name>');
          return;
        }

        const name = args[1]!;
        const deleted = await deletePrompt(name);

        if (deleted) {
          displaySuccess(`Prompt snippet "${name}" deleted`);
        } else {
          displayError(`Prompt snippet not found: ${name}`);
        }
        console.log('');
        break;
      }

      case 'search': {
        if (args.length < 2) {
          displayError('Usage: /snippet search <query>');
          return;
        }

        const query = args.slice(1).join(' ');
        const results = await searchPrompts(query);

        if (results.length === 0) {
          displayInfo(`No snippets found matching: ${query}`);
          console.log('');
          return;
        }

        console.log('');
        console.log(gradients.brand(`Search Results: ${query}`));
        console.log('');

        for (const prompt of results) {
          console.log(`${colors.brand.primary(prompt.name)} ${colors.dim(`(used ${prompt.usageCount}x)`)}`);
          console.log(`  ${colors.tertiary(prompt.description || 'No description')}`);
          console.log('');
        }

        console.log(colors.dim(`Found ${results.length} snippet${results.length > 1 ? 's' : ''}`));
        console.log('');
        break;
      }

      default:
        displayError('Unknown snippet command');
        console.log('');
        console.log(colors.secondary('Available commands:'));
        console.log(`  ${colors.brand.primary('/snippet save <name> <content>')} - Save a new snippet`);
        console.log(`  ${colors.brand.primary('/snippet list')} - List all snippets`);
        console.log(`  ${colors.brand.primary('/snippet use <name>')} - Use a snippet`);
        console.log(`  ${colors.brand.primary('/snippet delete <name>')} - Delete a snippet`);
        console.log(`  ${colors.brand.primary('/snippet search <query>')} - Search snippets`);
        console.log('');
        break;
    }
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to execute snippet command'
    );
  }
}

/**
 * Handle /context command in REPL
 */
async function handleContextCommand(
  args: string[],
  session: ChatSession
): Promise<void> {
  const {
    getDefaultContextConfig,
    addContextRule,
    setTokenBudget,
    getContextStats,
  } = await import('../context/index.js');

  // Initialize context config if not exists
  if (!session.contextConfig) {
    session.contextConfig = getDefaultContextConfig();
  }

  const subCommand = args[0]?.toLowerCase();

  try {
    switch (subCommand) {
      case 'include': {
        if (args.length < 2) {
          displayError('Usage: /context include <pattern>');
          console.log('');
          console.log(colors.secondary('Example:'));
          console.log(colors.tertiary('  /context include src/**/*.ts'));
          console.log('');
          return;
        }

        const pattern = args[1]!;
        session.contextConfig = addContextRule(session.contextConfig, 'include', pattern);
        await saveSession(session);

        displaySuccess(`Added include rule: ${pattern}`);
        console.log('');
        break;
      }

      case 'exclude': {
        if (args.length < 2) {
          displayError('Usage: /context exclude <pattern>');
          console.log('');
          console.log(colors.secondary('Example:'));
          console.log(colors.tertiary('  /context exclude **/*.test.ts'));
          console.log('');
          return;
        }

        const pattern = args[1]!;
        session.contextConfig = addContextRule(session.contextConfig, 'exclude', pattern);
        await saveSession(session);

        displaySuccess(`Added exclude rule: ${pattern}`);
        console.log('');
        break;
      }

      case 'budget': {
        if (args.length < 2) {
          displayError('Usage: /context budget <tokens|clear>');
          console.log('');
          console.log(colors.secondary('Examples:'));
          console.log(colors.tertiary('  /context budget 4000  # Set max tokens'));
          console.log(colors.tertiary('  /context budget clear # Remove limit'));
          console.log('');
          return;
        }

        const budgetArg = args[1]!;
        if (budgetArg === 'clear') {
          session.contextConfig = setTokenBudget(session.contextConfig, undefined);
          displaySuccess('Token budget cleared');
        } else {
          const budget = parseInt(budgetArg, 10);
          if (isNaN(budget) || budget <= 0) {
            displayError('Budget must be a positive number');
            return;
          }
          session.contextConfig = setTokenBudget(session.contextConfig, budget);
          displaySuccess(`Token budget set to ${budget}`);
        }

        await saveSession(session);
        console.log('');
        break;
      }

      case 'stats': {
        const stats = getContextStats(session.messages, session.contextConfig);

        console.log('');
        console.log(gradients.brand('Context Statistics'));
        console.log('');

        console.log(`${colors.brand.primary('Total Messages:')} ${stats.totalMessages}`);
        console.log(`${colors.brand.primary('Included Messages:')} ${stats.includedMessages}`);
        console.log(`${colors.brand.primary('Estimated Tokens:')} ${stats.estimatedTokens}`);

        if (session.contextConfig.tokenBudget) {
          const percentage = Math.round((stats.estimatedTokens / session.contextConfig.tokenBudget) * 100);
          console.log(`${colors.brand.primary('Budget Usage:')} ${percentage}% (${stats.estimatedTokens}/${session.contextConfig.tokenBudget})`);
        }

        console.log(`${colors.brand.primary('Active Rules:')} ${stats.rulesApplied}`);
        console.log('');

        if (session.contextConfig.rules.length > 0) {
          console.log(colors.secondary('Rules:'));
          for (let i = 0; i < session.contextConfig.rules.length; i++) {
            const rule = session.contextConfig.rules[i]!;
            const icon = rule.type === 'include' ? '✓' : '✗';
            console.log(`  ${i + 1}. ${colors.tertiary(icon)} ${rule.type} ${colors.dim(rule.pattern)}`);
          }
          console.log('');
        }
        break;
      }

      case 'reset': {
        session.contextConfig = getDefaultContextConfig();
        await saveSession(session);

        displaySuccess('Context configuration reset to defaults');
        console.log('');
        break;
      }

      default:
        displayError('Unknown context command');
        console.log('');
        console.log(colors.secondary('Available commands:'));
        console.log(`  ${colors.brand.primary('/context include <pattern>')} - Include files matching pattern`);
        console.log(`  ${colors.brand.primary('/context exclude <pattern>')} - Exclude files matching pattern`);
        console.log(`  ${colors.brand.primary('/context budget <tokens>')} - Set token budget`);
        console.log(`  ${colors.brand.primary('/context stats')} - Show context statistics`);
        console.log(`  ${colors.brand.primary('/context reset')} - Reset to defaults`);
        console.log('');
        break;
    }
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to execute context command'
    );
  }
}

/**
 * Handle /branch command in REPL
 */
async function handleBranchCommand(
  args: string[],
  session: ChatSession
): Promise<void> {
  const {
    initializeBranches,
    createBranch,
    switchBranch,
    listBranches,
    deleteBranch,
    getCurrentBranch,
  } = await import('../branches/index.js');

  // Initialize branch metadata if not exists
  if (!session.branchMetadata) {
    session.branchMetadata = initializeBranches(session.messages);
  }

  const subCommand = args[0]?.toLowerCase();

  try {
    switch (subCommand) {
      case 'create': {
        if (args.length < 2) {
          displayError('Usage: /branch create <name>');
          console.log('');
          console.log(colors.secondary('Example:'));
          console.log(colors.tertiary('  /branch create alternative-approach'));
          console.log('');
          return;
        }

        const name = args.slice(1).join(' ');
        session.branchMetadata = createBranch(session.branchMetadata, name, session.messages);
        await saveSession(session);

        displaySuccess(`Created and switched to new branch: ${name}`);
        console.log(colors.dim(`  Branch ID: ${session.branchMetadata.currentBranchId.substring(0, 8)}...`));
        console.log('');
        break;
      }

      case 'list': {
        const branches = listBranches(session.branchMetadata);

        console.log('');
        console.log(gradients.brand('Conversation Branches'));
        console.log('');

        for (const branch of branches) {
          const isActive = branch.isActive;
          const icon = isActive ? '◉' : '○';
          const idShort = branch.id === 'main' ? 'main' : branch.id.substring(0, 8) + '...';

          console.log(`${isActive ? colors.brand.primary(icon) : colors.dim(icon)} ${isActive ? colors.secondary(branch.name) : colors.dim(branch.name)}`);
          console.log(`  ${colors.dim(`ID: ${idShort} | ${branch.messages.length} messages | Created: ${new Date(branch.createdAt).toLocaleDateString()}`)}`);
          console.log('');
        }

        console.log(colors.secondary('Commands:'));
        console.log(`  ${colors.brand.primary('/branch switch <id>')} - Switch to a branch`);
        console.log(`  ${colors.brand.primary('/branch create <name>')} - Create new branch`);
        console.log('');
        break;
      }

      case 'switch': {
        if (args.length < 2) {
          displayError('Usage: /branch switch <branch-id>');
          console.log('');
          console.log(colors.secondary('Tip: Use /branch list to see all branches'));
          console.log('');
          return;
        }

        const branchIdOrName = args[1]!;

        // Find branch by ID or name
        const allBranches = listBranches(session.branchMetadata);
        const targetBranch = allBranches.find(
          (b) => b.id === branchIdOrName || b.id.startsWith(branchIdOrName) || b.name === branchIdOrName
        );

        if (!targetBranch) {
          displayError(`Branch not found: ${branchIdOrName}`);
          console.log('');
          console.log(colors.secondary('Available branches:'));
          for (const b of allBranches) {
            console.log(`  ${colors.tertiary(b.name)} ${colors.dim(`(${b.id.substring(0, 8)}...)`)}`);
          }
          console.log('');
          return;
        }

        const result = switchBranch(session.branchMetadata, targetBranch.id);
        session.branchMetadata = result.metadata;
        session.messages = result.messages;
        await saveSession(session);

        displaySuccess(`Switched to branch: ${targetBranch.name}`);
        console.log(colors.dim(`  ${targetBranch.messages.length} messages in this branch`));
        console.log('');
        break;
      }

      case 'delete': {
        if (args.length < 2) {
          displayError('Usage: /branch delete <branch-id>');
          return;
        }

        const branchIdOrName = args[1]!;

        // Find branch by ID or name
        const allBranches = listBranches(session.branchMetadata);
        const targetBranch = allBranches.find(
          (b) => b.id === branchIdOrName || b.id.startsWith(branchIdOrName) || b.name === branchIdOrName
        );

        if (!targetBranch) {
          displayError(`Branch not found: ${branchIdOrName}`);
          return;
        }

        session.branchMetadata = deleteBranch(session.branchMetadata, targetBranch.id);
        await saveSession(session);

        displaySuccess(`Deleted branch: ${targetBranch.name}`);
        console.log('');
        break;
      }

      case 'current': {
        const current = getCurrentBranch(session.branchMetadata);
        if (current) {
          console.log('');
          console.log(colors.secondary('Current Branch:'));
          console.log(`  ${colors.brand.primary(current.name)}`);
          console.log(`  ${colors.dim(`ID: ${current.id === 'main' ? 'main' : current.id.substring(0, 8) + '...'} | ${current.messages.length} messages`)}`);
          console.log('');
        }
        break;
      }

      default:
        displayError('Unknown branch command');
        console.log('');
        console.log(colors.secondary('Available commands:'));
        console.log(`  ${colors.brand.primary('/branch create <name>')} - Create new branch from current state`);
        console.log(`  ${colors.brand.primary('/branch list')} - List all branches`);
        console.log(`  ${colors.brand.primary('/branch switch <id>')} - Switch to a different branch`);
        console.log(`  ${colors.brand.primary('/branch delete <id>')} - Delete a branch`);
        console.log(`  ${colors.brand.primary('/branch current')} - Show current branch`);
        console.log('');
        break;
    }
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to execute branch command'
    );
  }
}
