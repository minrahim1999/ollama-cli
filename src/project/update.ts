/**
 * PROJECT.md auto-update functionality
 * Updates timestamp after AI responses to keep context current
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update PROJECT.md last updated timestamp
 * Called after AI responses to keep the file current
 */
export async function updateProjectTimestamp(projectPath: string): Promise<void> {
  const mdPath = path.join(projectPath, 'PROJECT.md');

  try {
    // Check if PROJECT.md exists
    if (!(await fileExists(mdPath))) {
      return; // Nothing to update
    }

    // Read current content
    let content = await fs.readFile(mdPath, 'utf-8');

    // Update timestamp in footer
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Replace last updated line if it exists
    const lastUpdatedRegex = /\*\*Last updated:\*\* .+/;
    if (lastUpdatedRegex.test(content)) {
      content = content.replace(lastUpdatedRegex, `**Last updated:** ${dateString}`);
    } else {
      // Add last updated line at the end if not present
      content = content.trimEnd() + `\n\n---\n\n**Last updated:** ${dateString}\n**Auto-updated by:** ollama-cli conversation system\n`;
    }

    // Write back
    await fs.writeFile(mdPath, content, 'utf-8');
  } catch (error) {
    // Silently fail - this is a nice-to-have feature
    // Don't interrupt the user's workflow if update fails
  }
}
