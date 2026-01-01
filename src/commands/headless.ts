/**
 * Headless command - Non-interactive execution
 */

import fs from 'fs/promises';
import {
  executeHeadless,
  executeBatchHeadless,
  formatHeadlessOutput,
  formatBatchOutput,
  getExitCode,
  type HeadlessOptions,
} from '../modes/headless.js';
import { displayError } from '../ui/display.js';

export interface HeadlessCommandOptions {
  model?: string;
  baseUrl?: string;
  system?: string;
  temperature?: number;
  format?: 'json' | 'text';
  timeout?: number;
  file?: string;
  batch?: boolean;
}

/**
 * Execute headless command
 */
export async function headlessCommand(
  prompt: string | undefined,
  options: HeadlessCommandOptions
): Promise<void> {
  try {
    const headlessOptions: HeadlessOptions = {
      model: options.model,
      baseUrl: options.baseUrl,
      systemPrompt: options.system,
      temperature: options.temperature,
      format: options.format || 'text',
      timeout: options.timeout,
    };

    // Handle file input
    if (options.file) {
      const fileContent = await fs.readFile(options.file, 'utf-8');

      if (options.batch) {
        // Batch mode: one prompt per line
        const prompts = fileContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        const results = await executeBatchHeadless(prompts, headlessOptions);
        const output = formatBatchOutput(results, options.format || 'text');
        console.log(output);
        process.exit(getExitCode(results));
      } else {
        // Single prompt from file
        const result = await executeHeadless(fileContent, headlessOptions);
        const output = formatHeadlessOutput(result, options.format || 'text');
        console.log(output);
        process.exit(getExitCode(result));
      }
    }

    // Handle stdin
    if (!prompt && process.stdin.isTTY === false) {
      let stdinContent = '';
      process.stdin.setEncoding('utf-8');

      for await (const chunk of process.stdin) {
        stdinContent += chunk;
      }

      const result = await executeHeadless(stdinContent.trim(), headlessOptions);
      const output = formatHeadlessOutput(result, options.format || 'text');
      console.log(output);
      process.exit(getExitCode(result));
    }

    // Handle direct prompt
    if (prompt) {
      const result = await executeHeadless(prompt, headlessOptions);
      const output = formatHeadlessOutput(result, options.format || 'text');
      console.log(output);
      process.exit(getExitCode(result));
    }

    // No input provided
    displayError('No prompt provided. Use --file, stdin, or provide a prompt argument.');
    process.exit(1);
  } catch (error) {
    displayError(`Headless execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}
