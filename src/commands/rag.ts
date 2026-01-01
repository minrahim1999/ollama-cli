/**
 * RAG command - Vector embeddings and context retrieval
 */

import {
  addDocument,
  addDocuments,
  search,
  clearVectorStore,
  getVectorStoreStats,
} from '../rag/index.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';
import { getEffectiveConfig } from '../config/index.js';
import { buildIndex } from '../indexing/index.js';
import fs from 'fs/promises';
import path from 'path';

export type RagCommand = 'add' | 'search' | 'index' | 'stats' | 'clear';

interface RagOptions {
  file?: string | undefined;
  type?: 'code' | 'documentation' | 'text' | undefined;
  language?: string | undefined;
  model?: string | undefined;
  topk?: number | undefined;
  minScore?: number | undefined;
}

/**
 * Main RAG command handler
 */
export async function ragCommand(
  command: RagCommand,
  args: string[],
  options: RagOptions
): Promise<void> {
  const config = await getEffectiveConfig();

  switch (command) {
    case 'add':
      if (args.length === 0 && !options.file) {
        displayError('Usage: ollama-cli rag add <text> or --file <path>');
        return;
      }
      await addCmd(args.join(' '), options, config.baseUrl);
      break;

    case 'search':
      if (args.length === 0) {
        displayError('Usage: ollama-cli rag search <query>');
        return;
      }
      await searchCmd(args.join(' '), options, config.baseUrl);
      break;

    case 'index':
      await indexCodebaseCmd(config.baseUrl, options);
      break;

    case 'stats':
      await statsCmd();
      break;

    case 'clear':
      await clearCmd();
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: add, search, index, stats, clear');
  }
}

/**
 * Add document to vector store
 */
async function addCmd(text: string, options: RagOptions, baseUrl: string): Promise<void> {
  try {
    let content = text;
    let source = 'manual';

    // Read from file if specified
    if (options.file) {
      const filePath = path.resolve(process.cwd(), options.file);
      content = await fs.readFile(filePath, 'utf-8');
      source = filePath;
    }

    startSpinner('Generating embedding...');

    const doc = await addDocument(
      content,
      {
        source,
        type: options.type || 'text',
        language: options.language,
        createdAt: new Date().toISOString(),
        size: content.length,
      },
      baseUrl,
      { model: options.model }
    );

    stopSpinner();

    displaySuccess(`Document added to vector store`);
    console.log('');
    console.log(colors.tertiary(`ID: ${doc.id}`));
    console.log(colors.dim(`Size: ${doc.metadata.size} bytes`));
    console.log('');
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Failed to add document');
  }
}

/**
 * Search for similar documents
 */
async function searchCmd(query: string, options: RagOptions, baseUrl: string): Promise<void> {
  try {
    startSpinner('Searching...');

    const results = await search(query, baseUrl, {
      topK: options.topk || 5,
      minScore: options.minScore || 0.5,
      filter: {
        type: options.type,
        language: options.language,
      },
    });

    stopSpinner();

    if (results.length === 0) {
      displayInfo('No results found');
      return;
    }

    console.log('');
    console.log(gradients.brand('Search Results'));
    console.log('');

    for (const result of results) {
      console.log(colors.secondary(`${result.rank}. ${result.document.metadata.source}`));
      console.log(colors.dim(`   Score: ${result.score.toFixed(4)} | Type: ${result.document.metadata.type}`));

      // Show preview (first 150 chars)
      const preview = result.document.content.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   ${colors.tertiary(preview)}${result.document.content.length > 150 ? '...' : ''}`);
      console.log('');
    }
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Search failed');
  }
}

/**
 * Index entire codebase for RAG
 */
async function indexCodebaseCmd(baseUrl: string, options: RagOptions): Promise<void> {
  try {
    const projectRoot = process.cwd();

    startSpinner('Building codebase index...');

    // Build symbol index first
    const codebaseIndex = await buildIndex(projectRoot);

    stopSpinner();

    console.log('');
    console.log(gradients.brand('Indexing Codebase for RAG'));
    console.log('');
    console.log(colors.secondary(`Found ${codebaseIndex.totalFiles} files, ${codebaseIndex.totalSymbols} symbols`));
    console.log('');

    // Create documents from files
    const documents = await Promise.all(
      codebaseIndex.files.map(async file => {
        const content = await fs.readFile(file.file, 'utf-8');
        // Infer language from file extension
        const ext = path.extname(file.file);
        const language = ext === '.ts' ? 'typescript' : ext === '.js' ? 'javascript' : ext === '.py' ? 'python' : ext;

        return {
          content,
          metadata: {
            source: file.file,
            type: 'code' as const,
            language,
            createdAt: new Date().toISOString(),
            size: content.length,
          },
        };
      })
    );

    startSpinner('Generating embeddings...');

    await addDocuments(documents, baseUrl, {
      model: options.model,
      onProgress: (current, total) => {
        stopSpinner();
        const percentage = Math.round((current / total) * 100);
        startSpinner(`Embedding ${current}/${total} (${percentage}%)`);
      },
    });

    stopSpinner();

    displaySuccess(`Indexed ${documents.length} files for RAG retrieval`);
    console.log('');
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Failed to index codebase');
  }
}

/**
 * Show vector store statistics
 */
async function statsCmd(): Promise<void> {
  try {
    const stats = await getVectorStoreStats();

    if (!stats) {
      displayInfo('Vector store is empty');
      return;
    }

    console.log('');
    console.log(gradients.brand('Vector Store Statistics'));
    console.log('');
    console.log(colors.secondary(`Documents: ${stats.documents}`));
    console.log(colors.secondary(`Embedding Model: ${stats.embeddingModel}`));
    console.log(colors.secondary(`Dimensions: ${stats.dimensions}`));
    console.log(colors.dim(`Size: ${(stats.size / 1024).toFixed(2)} KB`));
    console.log(colors.dim(`Created: ${new Date(stats.createdAt).toLocaleString()}`));
    console.log(colors.dim(`Updated: ${new Date(stats.updatedAt).toLocaleString()}`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to get stats');
  }
}

/**
 * Clear vector store
 */
async function clearCmd(): Promise<void> {
  try {
    await clearVectorStore();
    displaySuccess('Vector store cleared');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to clear vector store');
  }
}
