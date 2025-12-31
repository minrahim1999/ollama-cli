/**
 * Code analysis tools
 */

import fs from 'fs/promises';
import path from 'path';
import type { ToolCallResult } from '../types/tools.js';

/**
 * Analyze Code - Analyze code structure
 */
export async function analyzeCode(params: { filePath: string }): Promise<ToolCallResult> {
  try {
    const content = await fs.readFile(params.filePath, 'utf-8');
    const ext = path.extname(params.filePath);

    const analysis: any = {
      file: params.filePath,
      extension: ext,
      lines: content.split('\n').length,
      size: Buffer.byteLength(content, 'utf-8'),
    };

    // Basic analysis for TypeScript/JavaScript
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      analysis.functions = (content.match(/function\s+\w+/g) || []).map((m) =>
        m.replace('function ', '')
      );
      analysis.classes = (content.match(/class\s+\w+/g) || []).map((m) =>
        m.replace('class ', '')
      );
      analysis.interfaces = (content.match(/interface\s+\w+/g) || []).map((m) =>
        m.replace('interface ', '')
      );
      analysis.exports = (content.match(/export\s+(const|function|class|interface)\s+\w+/g) || []).map((m) =>
        m.replace(/export\s+(const|function|class|interface)\s+/, '')
      );
      analysis.imports = (content.match(/import\s+.+from\s+['"]/g) || []).length;
    }

    // Python analysis
    if (ext === '.py') {
      analysis.functions = (content.match(/def\s+\w+/g) || []).map((m) =>
        m.replace('def ', '')
      );
      analysis.classes = (content.match(/class\s+\w+/g) || []).map((m) =>
        m.replace('class ', '')
      );
      analysis.imports = (content.match(/^(import|from)\s+/gm) || []).length;
    }

    return {
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze code',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Find Symbol - Find where a symbol is defined/used
 */
export async function findSymbol(params: {
  symbol: string;
  path?: string;
}): Promise<ToolCallResult> {
  try {
    const searchPath = params.path || process.cwd();
    const results: Array<{ file: string; line: number; content: string; type: string }> = [];

    async function search(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await search(fullPath);
          }
        } else if (['.ts', '.tsx', '.js', '.jsx', '.py'].includes(path.extname(entry.name))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
              // Check for definition patterns
              const defPatterns = [
                new RegExp(`\\b(function|const|let|var|class|interface|type)\\s+${params.symbol}\\b`),
                new RegExp(`\\bdef\\s+${params.symbol}\\b`), // Python
              ];

              const isDefinition = defPatterns.some((p) => p.test(line));

              // Check for usage
              const isUsage = new RegExp(`\\b${params.symbol}\\b`).test(line);

              if (isDefinition || isUsage) {
                results.push({
                  file: path.relative(searchPath, fullPath),
                  line: idx + 1,
                  content: line.trim(),
                  type: isDefinition ? 'definition' : 'usage',
                });
              }
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }

    await search(searchPath);

    return {
      success: true,
      data: {
        symbol: params.symbol,
        results,
        total: results.length,
        definitions: results.filter((r) => r.type === 'definition').length,
        usages: results.filter((r) => r.type === 'usage').length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find symbol',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get Imports - List all imports in a file
 */
export async function getImports(params: { filePath: string }): Promise<ToolCallResult> {
  try {
    const content = await fs.readFile(params.filePath, 'utf-8');
    const ext = path.extname(params.filePath);

    const imports: Array<{ source: string; imports: string[]; line: number }> = [];

    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Match: import { a, b } from 'source'
        const namedMatch = line.match(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
        if (namedMatch) {
          imports.push({
            source: namedMatch[2]!,
            imports: namedMatch[1]!.split(',').map((s) => s.trim()),
            line: idx + 1,
          });
        }

        // Match: import source from 'source'
        const defaultMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (defaultMatch && !namedMatch) {
          imports.push({
            source: defaultMatch[2]!,
            imports: [defaultMatch[1]!],
            line: idx + 1,
          });
        }

        // Match: import * as name from 'source'
        const namespaceMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (namespaceMatch) {
          imports.push({
            source: namespaceMatch[2]!,
            imports: [`* as ${namespaceMatch[1]}`],
            line: idx + 1,
          });
        }
      });
    }

    return {
      success: true,
      data: {
        file: params.filePath,
        imports,
        total: imports.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get imports',
      timestamp: new Date().toISOString(),
    };
  }
}
