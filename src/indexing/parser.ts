/**
 * Code parser - Extract symbols from source files
 * Uses regex-based parsing for simplicity and speed
 */

import type { Symbol, SymbolType } from '../types/indexing.js';

/**
 * Parse TypeScript/JavaScript file and extract symbols
 */
export function parseTypeScriptFile(content: string, filePath: string): Symbol[] {
  const symbols: Symbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNumber = i + 1;

    // Function declarations
    const funcMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/);
    if (funcMatch) {
      symbols.push({
        name: funcMatch[1]!,
        type: 'function',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        signature: `function ${funcMatch[1]}(${funcMatch[2]})`,
        exported: line.includes('export'),
      });
    }

    // Arrow functions (const/let name = ...)
    const arrowMatch = line.match(/^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>/);
    if (arrowMatch) {
      symbols.push({
        name: arrowMatch[1]!,
        type: 'const',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        signature: `${arrowMatch[1]}(${arrowMatch[2]})`,
        exported: line.includes('export'),
      });
    }

    // Class declarations
    const classMatch = line.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) {
      symbols.push({
        name: classMatch[1]!,
        type: 'class',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        exported: line.includes('export'),
      });
    }

    // Interface declarations
    const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/);
    if (interfaceMatch) {
      symbols.push({
        name: interfaceMatch[1]!,
        type: 'interface',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        exported: line.includes('export'),
      });
    }

    // Type aliases
    const typeMatch = line.match(/^(?:export\s+)?type\s+(\w+)\s*=/);
    if (typeMatch) {
      symbols.push({
        name: typeMatch[1]!,
        type: 'type',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        exported: line.includes('export'),
      });
    }

    // Const/let/var declarations
    const varMatch = line.match(/^(?:export\s+)?(const|let|var)\s+(\w+)\s*=/);
    if (varMatch && !arrowMatch) {
      symbols.push({
        name: varMatch[2]!,
        type: varMatch[1] as SymbolType,
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        exported: line.includes('export'),
      });
    }
  }

  return symbols;
}

/**
 * Parse Python file and extract symbols
 */
export function parsePythonFile(content: string, filePath: string): Symbol[] {
  const symbols: Symbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNumber = i + 1;

    // Function definitions
    const funcMatch = line.match(/^(?:async\s+)?def\s+(\w+)\s*\((.*?)\)/);
    if (funcMatch) {
      symbols.push({
        name: funcMatch[1]!,
        type: 'function',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
        signature: `def ${funcMatch[1]}(${funcMatch[2]})`,
      });
    }

    // Class definitions
    const classMatch = line.match(/^class\s+(\w+)/);
    if (classMatch) {
      symbols.push({
        name: classMatch[1]!,
        type: 'class',
        file: filePath,
        line: lineNumber,
        code: line.trim(),
      });
    }
  }

  return symbols;
}

/**
 * Extract imports from file
 */
export function extractImports(content: string): string[] {
  const imports: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // ES6 imports
    const es6Match = line.match(/import\s+.*?\s+from\s+['"](.+?)['"]/);
    if (es6Match) {
      imports.push(es6Match[1]!);
    }

    // Python imports
    const pyMatch = line.match(/(?:from\s+(\S+)\s+)?import\s+/);
    if (pyMatch && pyMatch[1]) {
      imports.push(pyMatch[1]);
    }
  }

  return imports;
}

/**
 * Extract exports from file
 */
export function extractExports(content: string): string[] {
  const exports: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Named exports
    const namedMatch = line.match(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/);
    if (namedMatch) {
      exports.push(namedMatch[1]!);
    }

    // Export { ... }
    const bracesMatch = line.match(/export\s+\{([^}]+)\}/);
    if (bracesMatch) {
      const names = bracesMatch[1]!.split(',').map(n => n.trim().split(/\s+as\s+/)[0]!.trim());
      exports.push(...names);
    }
  }

  return exports;
}

/**
 * Parse file based on extension
 */
export function parseFile(content: string, filePath: string): Symbol[] {
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return parseTypeScriptFile(content, filePath);
    case 'py':
      return parsePythonFile(content, filePath);
    default:
      return [];
  }
}
