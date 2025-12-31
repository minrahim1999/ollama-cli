/**
 * One-shot ask command
 * Get quick responses without starting an interactive session
 */

import fs from 'fs/promises';
import type { Message } from '../types/index.js';
import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import { displayError, formatAssistantPrefix } from '../ui/display.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';

interface AskOptions {
  model?: string;
  json?: string;
  raw?: boolean;
  system?: string;
}

export async function askCommand(prompt: string, options: AskOptions): Promise<void> {
  const config = await getEffectiveConfig();
  const model = options.model || config.defaultModel;
  const client = new OllamaClient(config.baseUrl, config.timeoutMs);

  // Build messages array
  const messages: Message[] = [];

  if (options.system) {
    messages.push({
      role: 'system',
      content: options.system,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  try {
    // Handle JSON mode
    if (options.json) {
      startSpinner('Generating JSON response...');

      try {
        // Load and validate schema
        const schemaContent = await fs.readFile(options.json, 'utf-8');
        const schema = JSON.parse(schemaContent) as Record<string, unknown>;

        // Make request with JSON format
        const response = await client.chat({
          model,
          messages,
          stream: false,
          format: {
            type: 'json',
            schema,
          },
        });

        stopSpinner();

        // Collect full response
        let fullResponse = '';
        for await (const chunk of response) {
          fullResponse += chunk;
        }

        // Parse and display JSON
        if (options.raw) {
          console.log(fullResponse);
        } else {
          try {
            const parsed = JSON.parse(fullResponse);
            console.log(JSON.stringify(parsed, null, 2));
          } catch {
            // If not valid JSON, display as-is
            console.log(fullResponse);
          }
        }

        process.exit(0);
      } catch (error) {
        stopSpinner();
        if (error instanceof Error) {
          if (error.message.includes('ENOENT')) {
            displayError(`Schema file not found: ${options.json}`);
          } else if (error.message.includes('JSON')) {
            displayError(`Invalid JSON schema file: ${options.json}`);
          } else {
            displayError(error.message);
          }
        } else {
          displayError('An unknown error occurred');
        }
        process.exit(1);
      }
    } else {
      // Regular text response
      if (!options.raw) {
        process.stdout.write(formatAssistantPrefix());
      }

      let hasOutput = false;

      for await (const chunk of client.chat({
        model,
        messages,
      })) {
        process.stdout.write(chunk);
        hasOutput = true;
      }

      if (hasOutput) {
        console.log(''); // Add newline at the end
      }

      process.exit(0);
    }
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('An unknown error occurred');
    }
    process.exit(1);
  }
}
