/**
 * Codebase indexing type definitions
 * Enables semantic search and context retrieval
 */

export type SymbolType = 'function' | 'class' | 'interface' | 'type' | 'const' | 'let' | 'var' | 'import' | 'export';

export interface Symbol {
  name: string;
  type: SymbolType;
  file: string;
  line: number;
  code: string;
  signature?: string | undefined;
  parent?: string | undefined; // For methods inside classes
  exported?: boolean | undefined;
}

export interface FileIndex {
  file: string;
  lastModified: number;
  size: number;
  symbols: Symbol[];
  imports: string[];
  exports: string[];
}

export interface CodebaseIndex {
  version: string;
  indexedAt: string;
  projectRoot: string;
  files: FileIndex[];
  totalSymbols: number;
  totalFiles: number;
}

export interface SearchOptions {
  type?: SymbolType | SymbolType[];
  file?: string;
  exported?: boolean;
  limit?: number;
}

export interface SearchResult {
  symbol: Symbol;
  score: number; // Relevance score (0-1)
}

export interface IndexStats {
  totalFiles: number;
  totalSymbols: number;
  indexSize: number;
  lastIndexed: string;
  indexAge: string; // Human readable
}
