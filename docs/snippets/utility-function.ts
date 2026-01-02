/**
 * Utility Function Snippet
 *
 * Use this template when creating utility functions.
 * Replace {{FUNCTION}} with your function name and {{MODULE}} with module name
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * {{FUNCTION}} - Brief description of what this function does
 *
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @param options - Optional configuration
 * @returns Description of return value
 *
 * @throws Error when validation fails or operation errors
 *
 * @example
 * ```typescript
 * const result = await {{FUNCTION}}('input', 123, { verbose: true });
 * console.log(result);
 * ```
 */
export async function {{FUNCTION}}(
  param1: string,
  param2: number,
  options: { verbose?: boolean } = {}
): Promise<string> {
  // Input validation
  if (!param1) {
    throw new Error('param1 is required');
  }

  if (param2 < 0) {
    throw new Error('param2 must be non-negative');
  }

  try {
    // Log if verbose
    if (options.verbose) {
      console.log(`Processing ${param1}...`);
    }

    // Main logic
    const result = await processInput(param1, param2);

    // Validate result
    if (!result) {
      throw new Error('Processing failed');
    }

    return result;
  } catch (error) {
    throw new Error(
      `Failed to {{FUNCTION}}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Helper function - Process input
 * (Private, not exported)
 */
async function processInput(input: string, count: number): Promise<string> {
  // Implementation
  return input.repeat(count);
}

/**
 * Synchronous utility function template
 */
export function {{FUNCTION}}Sync(param: string): string {
  // Input validation
  if (!param) {
    throw new Error('param is required');
  }

  try {
    // Synchronous processing
    return param.toUpperCase();
  } catch (error) {
    throw new Error(
      `Failed to {{FUNCTION}}Sync: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * File operation utility template
 */
export async function read{{MODULE}}File(filePath: string): Promise<unknown> {
  try {
    // Validate file path
    const resolvedPath = path.resolve(filePath);

    // Check if file exists
    await fs.access(resolvedPath);

    // Read file
    const content = await fs.readFile(resolvedPath, 'utf-8');

    // Parse and return
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }

    throw new Error(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * File write utility template
 */
export async function write{{MODULE}}File(
  filePath: string,
  data: unknown
): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  } catch (error) {
    throw new Error(
      `Failed to write file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Array processing utility template
 */
export function process{{MODULE}}Array<T>(
  items: T[],
  predicate: (item: T) => boolean
): T[] {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  return items.filter(predicate);
}

/**
 * Type guard utility template
 */
export function is{{MODULE}}(value: unknown): value is {{MODULE}}Type {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requiredField' in value &&
    typeof (value as any).requiredField === 'string'
  );
}

// Define the type for the type guard
interface {{MODULE}}Type {
  requiredField: string;
  optionalField?: number | undefined;
}
