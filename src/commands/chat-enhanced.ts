/**
 * Enhanced interactive chat command with tools and memory support
 * Provides a REPL interface with MCP tools integration
 */

import readline from 'readline';
import chalk from 'chalk';
import type { ChatSession } from '../types/index.js';
import type { ToolCallRequest } from '../types/tools.js';
import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import { getDefaultAssistant, getAssistant } from '../assistants/index.js';
import { detectProjectContext, readProjectMd } from '../project/index.js';
import { promptForPermissions } from '../project/permissions.js';
import {
  createSession,
  loadSession,
  saveSession,
  addMessage,
  clearMessages,
} from '../session/index.js';
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

interface ChatOptions {
  model?: string;
  session?: string;
  system?: string;
  tools?: boolean; // Enable tools mode
  workingDir?: string;
  assistant?: string; // Assistant ID to use
}

export async function chatCommandEnhanced(options: ChatOptions): Promise<void> {
  const config = await getEffectiveConfig();
  const model = options.model || config.defaultModel;
  const workingDir = options.workingDir || process.cwd();

  // Load assistant
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

  // Use assistant's tools setting if not explicitly overridden
  // Also check if project permissions allow tools
  let toolsEnabled = options.tools !== undefined ? options.tools : assistant.toolsEnabled;

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

  // Add system message from assistant
  if (session.messages.length === 0) {
    let systemMessage = options.system || assistant.systemPrompt;

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
      assistantName: assistant.name,
      assistantEmoji: assistant.emoji,
    });
  } else {
    displayWelcome(session.model, session.id);
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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('You: '),
  });

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

      for await (const chunk of client.chat({
        model: session.model,
        messages: session.messages,
      })) {
        const formattedChunk = formatStreamingChunk(chunk, isFirstChunk);
        process.stdout.write(formattedChunk);
        fullResponse += chunk;
        isFirstChunk = false;
      }

      displayAssistantMessageEnd();

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

      for await (const chunk of client.chat({
        model: session.model,
        messages: session.messages,
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
    default:
      displayError(`Unknown command: /${cmd}`, 'Type /help to see available commands');
      break;
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

  console.log(colors.secondary(`${symbols.circle} Planning`));
  console.log('');
  console.log(`  ${colors.brand.primary('/plan <task>')}     ${colors.tertiary('Create implementation plan')}`);
  console.log(`  ${colors.brand.primary('/plans')}           ${colors.tertiary('List all plans')}`);
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
