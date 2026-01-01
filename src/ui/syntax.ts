/**
 * Syntax highlighting for code blocks
 * Provides simple syntax highlighting using chalk
 */

import chalk from 'chalk';

interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract code blocks from markdown text
 */
export function extractCodeBlocks(text: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2]!,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}

/**
 * Simple syntax highlighting for common patterns
 */
function highlightCode(code: string, language: string): string {
  // Keywords by language
  const keywords: Record<string, string[]> = {
    javascript: [
      'const',
      'let',
      'var',
      'function',
      'async',
      'await',
      'return',
      'if',
      'else',
      'for',
      'while',
      'class',
      'export',
      'import',
      'from',
      'new',
      'try',
      'catch',
    ],
    typescript: [
      'const',
      'let',
      'var',
      'function',
      'async',
      'await',
      'return',
      'if',
      'else',
      'for',
      'while',
      'class',
      'export',
      'import',
      'from',
      'interface',
      'type',
      'enum',
      'new',
      'try',
      'catch',
    ],
    python: [
      'def',
      'class',
      'if',
      'elif',
      'else',
      'for',
      'while',
      'return',
      'import',
      'from',
      'as',
      'try',
      'except',
      'with',
      'async',
      'await',
    ],
    shell: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac'],
  };

  const langKeywords = keywords[language.toLowerCase()] || [];
  let highlighted = code;

  // Highlight strings (simple approach)
  highlighted = highlighted.replace(
    /(['"`])(.*?)\1/g,
    (_match, quote, content) => chalk.green(quote + content + quote)
  );

  // Highlight comments
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, (match) => chalk.dim(match));
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, (match) => chalk.dim(match));

  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, (match) => chalk.yellow(match));

  // Highlight keywords
  for (const keyword of langKeywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, (match) => chalk.magenta(match));
  }

  // Highlight function calls (word followed by ()
  highlighted = highlighted.replace(/\b(\w+)(\()/g, (_, name, paren) => {
    return chalk.cyan(name) + paren;
  });

  return highlighted;
}

/**
 * Apply syntax highlighting to text with code blocks
 */
export function highlightText(text: string): string {
  const blocks = extractCodeBlocks(text);

  if (blocks.length === 0) {
    return text; // No code blocks found
  }

  let result = '';
  let lastIndex = 0;

  for (const block of blocks) {
    // Add text before code block
    result += text.substring(lastIndex, block.startIndex);

    // Add highlighted code block with header
    const langLabel = block.language !== 'text' ? ` ${block.language}` : '';
    result += chalk.dim(`╭─${langLabel}\n`);

    const highlighted = highlightCode(block.code, block.language);
    const lines = highlighted.split('\n');

    for (const line of lines) {
      result += chalk.dim('│ ') + line + '\n';
    }

    result += chalk.dim('╰─\n');

    lastIndex = block.endIndex;
  }

  // Add remaining text
  result += text.substring(lastIndex);

  return result;
}

/**
 * Format streaming chunk with syntax highlighting
 * Note: This is a simplified version that doesn't highlight mid-block
 */
export function highlightStreamingChunk(
  chunk: string,
  _context?: {
    inCodeBlock?: boolean;
    language?: string;
  }
): string {
  // For streaming, we'll just return the chunk as-is
  // Full highlighting happens after streaming completes
  // This prevents partial highlighting issues
  return chunk;
}
