/**
 * Index command - Manage codebase index
 */

import { buildIndex, saveIndex, loadIndex, getIndexStats, needsReindex } from '../indexing/index.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';

export type IndexCommand = 'build' | 'rebuild' | 'stats' | 'clear';

/**
 * Main index command handler
 */
export async function indexCommand(command: IndexCommand, args: string[]): Promise<void> {
  switch (command) {
    case 'build':
      await buildIndexCmd(args[0] || process.cwd());
      break;

    case 'rebuild':
      await rebuildIndexCmd(args[0] || process.cwd());
      break;

    case 'stats':
      await statsCmd();
      break;

    case 'clear':
      await clearIndexCmd();
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: build, rebuild, stats, clear');
  }
}

/**
 * Build index (only if needed)
 */
async function buildIndexCmd(projectRoot: string): Promise<void> {
  try {
    const existingIndex = await loadIndex();

    if (existingIndex) {
      const needs = await needsReindex(existingIndex);
      if (!needs) {
        displayInfo('Index is up to date');
        return;
      }
    }

    await rebuildIndexCmd(projectRoot);
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to build index');
  }
}

/**
 * Force rebuild index
 */
async function rebuildIndexCmd(projectRoot: string): Promise<void> {
  try {
    console.log('');
    console.log(gradients.brand('Building Codebase Index'));
    console.log('');
    console.log(colors.tertiary(`Project: ${projectRoot}`));
    console.log('');

    startSpinner('Scanning files...');

    const index = await buildIndex(projectRoot, (current, total, file) => {
      stopSpinner();
      const percentage = Math.round((current / total) * 100);
      startSpinner(`Indexing ${current}/${total} (${percentage}%) - ${file.split('/').pop()}`);
    });

    stopSpinner();

    await saveIndex(index);

    console.log('');
    console.log(colors.success('✓ Index built successfully'));
    console.log('');
    console.log(colors.secondary('Results:'));
    console.log(`  ${colors.brand.primary(index.totalFiles.toString())} files indexed`);
    console.log(`  ${colors.brand.primary(index.totalSymbols.toString())} symbols found`);
    console.log('');
    console.log(colors.tertiary(`Index saved to: ~/.ollama-cli/index/codebase-index.json`));
    console.log('');
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Failed to rebuild index');
  }
}

/**
 * Show index statistics
 */
async function statsCmd(): Promise<void> {
  try {
    const index = await loadIndex();

    if (!index) {
      displayError('No index found', 'Run: ollama-cli index build');
      return;
    }

    const stats = getIndexStats(index);

    console.log('');
    console.log(gradients.brand('Codebase Index Statistics'));
    console.log('');
    console.log(colors.secondary('Project:'));
    console.log(`  ${index.projectRoot}`);
    console.log('');
    console.log(colors.secondary('Index Stats:'));
    console.log(`  ${colors.brand.primary('Files:')} ${stats.totalFiles}`);
    console.log(`  ${colors.brand.primary('Symbols:')} ${stats.totalSymbols}`);
    console.log(`  ${colors.brand.primary('Size:')} ${(stats.indexSize / 1024).toFixed(2)} KB`);
    console.log(`  ${colors.brand.primary('Last Indexed:')} ${stats.indexAge}`);
    console.log('');

    // Symbol breakdown
    const symbolCounts: Record<string, number> = {};
    for (const file of index.files) {
      for (const symbol of file.symbols) {
        symbolCounts[symbol.type] = (symbolCounts[symbol.type] || 0) + 1;
      }
    }

    console.log(colors.secondary('Symbol Breakdown:'));
    for (const [type, count] of Object.entries(symbolCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${colors.tertiary(type.padEnd(12))} ${colors.brand.primary(count.toString())}`);
    }
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to get stats');
  }
}

/**
 * Clear index
 */
async function clearIndexCmd(): Promise<void> {
  try {
    const { unlink } = await import('fs/promises');
    const path = await import('path');
    const { homedir } = await import('os');

    const indexFile = path.join(homedir(), '.ollama-cli', 'index', 'codebase-index.json');
    await unlink(indexFile);

    displaySuccess('Index cleared');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      displayInfo('No index to clear');
    } else {
      displayError(error instanceof Error ? error.message : 'Failed to clear index');
    }
  }
}
