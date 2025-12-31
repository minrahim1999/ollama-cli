/**
 * Export command - Export conversations to files
 */

import { loadSession } from '../session/index.js';
import { exportSession } from '../export/index.js';
import type { ExportFormat } from '../types/export.js';
import { displayError, displaySuccess } from '../ui/display.js';
import { colors } from '../ui/colors.js';

interface ExportOptions {
  format?: ExportFormat | undefined;
  output?: string | undefined;
  pretty?: boolean | undefined;
}

/**
 * Export command handler
 */
export async function exportCommand(
  sessionId: string,
  options: ExportOptions
): Promise<void> {
  try {
    // Load session
    const session = await loadSession(sessionId);

    if (!session) {
      displayError(`Session not found: ${sessionId}`);
      return;
    }

    // Determine format
    const format = options.format || 'markdown';

    if (!['json', 'markdown', 'txt'].includes(format)) {
      displayError(`Invalid format: ${format}. Use: json, markdown, or txt`);
      return;
    }

    // Export session
    const filePath = await exportSession(session, format, options.output);

    console.log('');
    displaySuccess(`Exported to: ${filePath}`);
    console.log('');
    console.log(colors.secondary('Session Details:'));
    console.log(`  ${colors.tertiary(`Name: ${session.name || session.id}`)}`);
    console.log(`  ${colors.tertiary(`Model: ${session.model}`)}`);
    console.log(`  ${colors.tertiary(`Messages: ${session.messages.length}`)}`);
    console.log(`  ${colors.tertiary(`Format: ${format}`)}`);
    console.log('');
  } catch (error) {
    displayError(
      error instanceof Error ? error.message : 'Failed to export session'
    );
  }
}
