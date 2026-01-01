/**
 * Codebase indexing - Build and search code symbol index
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import type {
  CodebaseIndex,
  FileIndex,
  SearchOptions,
  SearchResult,
  IndexStats,
} from '../types/indexing.js';
import { parseFile, extractImports, extractExports } from './parser.js';

const INDEX_DIR = path.join(homedir(), '.ollama-cli', 'index');
const INDEX_FILE = path.join(INDEX_DIR, 'codebase-index.json');
const INDEX_VERSION = '1.0.0';

/**
 * Ensure index directory exists
 */
async function ensureIndexDir(): Promise<void> {
  await fs.mkdir(INDEX_DIR, { recursive: true });
}

/**
 * Check if file should be indexed
 */
function shouldIndexFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const supportedExts = ['.ts', '.tsx', '.js', '.jsx', '.py'];

  // Skip node_modules, dist, build, etc.
  const ignoredDirs = ['node_modules', 'dist', 'build', '.git', 'coverage', '.next'];
  const isIgnored = ignoredDirs.some(dir => filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`));

  return supportedExts.includes(ext) && !isIgnored;
}

/**
 * Recursively find all files in directory
 */
async function findFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const subFiles = await findFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && shouldIndexFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors, etc.
  }

  return files;
}

/**
 * Index a single file
 */
async function indexFile(filePath: string, projectRoot: string): Promise<FileIndex | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);

    const symbols = parseFile(content, filePath);
    const imports = extractImports(content);
    const exports = extractExports(content);

    // Make path relative to project root
    const relativePath = path.relative(projectRoot, filePath);

    return {
      file: relativePath,
      lastModified: stats.mtimeMs,
      size: stats.size,
      symbols,
      imports,
      exports,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Build complete codebase index
 */
export async function buildIndex(projectRoot: string, onProgress?: (current: number, total: number, file: string) => void): Promise<CodebaseIndex> {
  const files = await findFiles(projectRoot);
  const fileIndices: FileIndex[] = [];
  let totalSymbols = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;

    if (onProgress) {
      onProgress(i + 1, files.length, file);
    }

    const fileIndex = await indexFile(file, projectRoot);
    if (fileIndex) {
      fileIndices.push(fileIndex);
      totalSymbols += fileIndex.symbols.length;
    }
  }

  const index: CodebaseIndex = {
    version: INDEX_VERSION,
    indexedAt: new Date().toISOString(),
    projectRoot,
    files: fileIndices,
    totalSymbols,
    totalFiles: fileIndices.length,
  };

  return index;
}

/**
 * Save index to disk
 */
export async function saveIndex(index: CodebaseIndex): Promise<void> {
  await ensureIndexDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * Load index from disk
 */
export async function loadIndex(): Promise<CodebaseIndex | null> {
  try {
    const content = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(content) as CodebaseIndex;
  } catch {
    return null;
  }
}

/**
 * Search index for symbols
 */
export function searchSymbols(
  index: CodebaseIndex,
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const fileIndex of index.files) {
    for (const symbol of fileIndex.symbols) {
      // Filter by type if specified
      if (options.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type];
        if (!types.includes(symbol.type)) {
          continue;
        }
      }

      // Filter by file if specified
      if (options.file && !symbol.file.includes(options.file)) {
        continue;
      }

      // Filter by exported if specified
      if (options.exported !== undefined && symbol.exported !== options.exported) {
        continue;
      }

      // Calculate relevance score
      const nameLower = symbol.name.toLowerCase();
      let score = 0;

      // Exact match
      if (nameLower === queryLower) {
        score = 1.0;
      }
      // Starts with
      else if (nameLower.startsWith(queryLower)) {
        score = 0.8;
      }
      // Contains
      else if (nameLower.includes(queryLower)) {
        score = 0.6;
      }
      // Fuzzy match (all characters present in order)
      else if (fuzzyMatch(queryLower, nameLower)) {
        score = 0.4;
      }

      if (score > 0) {
        results.push({ symbol, score });
      }
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  // Apply limit if specified
  if (options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Fuzzy match - check if all characters of query appear in order in target
 */
function fuzzyMatch(query: string, target: string): boolean {
  let queryIndex = 0;

  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex++;
      if (queryIndex === query.length) {
        return true;
      }
    }
  }

  return queryIndex === query.length;
}

/**
 * Get index statistics
 */
export function getIndexStats(index: CodebaseIndex): IndexStats {
  const indexAge = Date.now() - new Date(index.indexedAt).getTime();
  const ageMinutes = Math.floor(indexAge / 1000 / 60);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  let ageString: string;
  if (ageDays > 0) {
    ageString = `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
  } else if (ageHours > 0) {
    ageString = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
  } else if (ageMinutes > 0) {
    ageString = `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
  } else {
    ageString = 'just now';
  }

  return {
    totalFiles: index.totalFiles,
    totalSymbols: index.totalSymbols,
    indexSize: JSON.stringify(index).length,
    lastIndexed: index.indexedAt,
    indexAge: ageString,
  };
}

/**
 * Check if index needs update (based on file modifications)
 */
export async function needsReindex(index: CodebaseIndex): Promise<boolean> {
  // Reindex if older than 1 hour
  const indexAge = Date.now() - new Date(index.indexedAt).getTime();
  if (indexAge > 60 * 60 * 1000) {
    return true;
  }

  // Check if any indexed files have been modified
  for (const fileIndex of index.files) {
    const fullPath = path.join(index.projectRoot, fileIndex.file);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.mtimeMs > fileIndex.lastModified) {
        return true;
      }
    } catch {
      // File deleted or inaccessible
      return true;
    }
  }

  return false;
}
