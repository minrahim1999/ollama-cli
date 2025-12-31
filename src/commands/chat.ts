/**
 * Interactive chat command
 * Provides a REPL interface for conversing with AI models
 */

import readline from 'readline';
import chalk from 'chalk';
import type { ChatSession } from '../types/index.js';
import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import {
  createSession,
  loadSession,
  saveSession,
  addMessage,
  clearMessages,
} from '../session/index.js';
import {
  displayWelcome,
  displayHelp,
  displayError,
  displaySuccess,
  displayModels,
  formatAssistantPrefix,
} from '../ui/display.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';

interface ChatOptions {
  model?: string;
  session?: string;
  system?: string;
}

export async function chatCommand(options: ChatOptions): Promise<void> {
  const config = await getEffectiveConfig();
  const model = options.model || config.defaultModel;

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

  // Add system message if provided
  if (options.system && session.messages.length === 0) {
    await addMessage(session, {
      role: 'system',
      content: options.system,
    });
  }

  displayWelcome(session.model, session.id);

  const client = new OllamaClient(config.baseUrl, config.timeoutMs);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('You: '),
  });

  let isProcessing = false;

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
      await handleCommand(trimmed, session, client, rl);
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
      process.stdout.write(formatAssistantPrefix());

      let fullResponse = '';

      for await (const chunk of client.chat({
        model: session.model,
        messages: session.messages,
      })) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }

      console.log('\n'); // Add newline after response

      // Add assistant message to session
      await addMessage(session, {
        role: 'assistant',
        content: fullResponse,
      });
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
    if (!isProcessing) {
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
      console.log(chalk.yellow('\n\nInterrupted. Saving session...'));
      await saveSession(session);
      process.exit(0);
    } else {
      rl.close();
    }
    })();
  });
}

/**
 * Handle REPL commands
 */
async function handleCommand(
  command: string,
  session: ChatSession,
  client: OllamaClient,
  rl: readline.Interface
): Promise<void> {
  const parts = command.slice(1).split(' ');
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      displayHelp();
      break;

    case 'models':
      try {
        startSpinner('Fetching models...');
        const response = await client.listModels();
        stopSpinner();
        console.log(''); // Add newline
        displayModels(response.models);
      } catch (error) {
        stopSpinner();
        if (error instanceof Error) {
          displayError(error.message);
        }
      }
      break;

    case 'clear':
      await clearMessages(session);
      displaySuccess('Conversation history cleared');
      break;

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

    case 'exit':
    case 'quit':
      await saveSession(session);
      console.log(chalk.grey('\nGoodbye!'));
      rl.close();
      process.exit(0);
      break;

    default:
      displayError(`Unknown command: /${cmd}`, 'Type /help to see available commands');
  }
}
