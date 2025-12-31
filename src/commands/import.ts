/**
 * Import command - Import conversations from files
 */

import { saveSession } from '../session/index.js';
import { importSession } from '../export/index.js';
import type { ExportFormat } from '../types/export.js';
import { displayError, displaySuccess } from '../ui/display.js';
import { colors } from '../ui/colors.js';

interface ImportOptions {
  name?: string | undefined;
  format?: ExportFormat | undefined;
}

/**
 * Import command handler
 */
export async function importCommand(
  filePath: string,
  options: ImportOptions
): Promise<void> {
  try {
    // Import session
    const session = await importSession(filePath, options.format, options.name);

    // Save session
    await saveSession(session);

    console.log('');
    displaySuccess('Conversation imported successfully');
    console.log('');
    console.log(colors.secondary('Session Details:'));
    console.log(`  ${colors.tertiary(`ID: ${session.id}`)}`);
    console.log(`  ${colors.tertiary(`Name: ${session.name || '(unnamed)'}`)}`);
    console.log(`  ${colors.tertiary(`Model: ${session.model}`)}`);
    console.log(`  ${colors.tertiary(`Messages: ${session.messages.length}`)}`);
    console.log('');
    console.log(colors.secondary('To use this session:'));
    console.log(`  ${colors.brand.primary(`ollama-cli chat -s ${session.id}`)}`);
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to import conversation'
    );
  }
}
