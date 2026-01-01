/**
 * Test runner - Execute tests and parse results
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import type { TestResult, TestOptions, TestFramework, TestFailure } from '../types/testing.js';

const execAsync = promisify(exec);

/**
 * Detect test framework from package.json
 */
export async function detectTestFramework(cwd: string): Promise<TestFramework> {
  try {
    const packagePath = path.join(cwd, 'package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content) as { scripts?: Record<string, string>; devDependencies?: Record<string, string> };

    // Check devDependencies
    if (pkg.devDependencies) {
      if ('vitest' in pkg.devDependencies) return 'vitest';
      if ('jest' in pkg.devDependencies) return 'jest';
      if ('mocha' in pkg.devDependencies) return 'mocha';
    }

    // Check scripts
    if (pkg.scripts?.test) {
      const testScript = pkg.scripts.test;
      if (testScript.includes('vitest')) return 'vitest';
      if (testScript.includes('jest')) return 'jest';
      if (testScript.includes('mocha')) return 'mocha';
      if (testScript.includes('pytest')) return 'pytest';
      return 'npm';
    }

    return 'npm';
  } catch {
    // Check for Python pytest
    try {
      await fs.access(path.join(cwd, 'pytest.ini'));
      return 'pytest';
    } catch {
      return 'npm';
    }
  }
}

/**
 * Build test command based on framework
 */
function buildTestCommand(framework: TestFramework, options: TestOptions): string {
  switch (framework) {
    case 'vitest':
      let cmd = 'npx vitest run';
      if (options.file) cmd += ` ${options.file}`;
      if (options.pattern) cmd += ` --grep="${options.pattern}"`;
      return cmd;

    case 'jest':
      return `npx jest${options.file ? ` ${options.file}` : ''}${options.pattern ? ` -t "${options.pattern}"` : ''}`;

    case 'mocha':
      return `npx mocha${options.file ? ` ${options.file}` : ''}${options.pattern ? ` --grep "${options.pattern}"` : ''}`;

    case 'pytest':
      return `pytest${options.file ? ` ${options.file}` : ''}${options.pattern ? ` -k "${options.pattern}"` : ''} -v`;

    case 'npm':
    default:
      return 'npm test';
  }
}

/**
 * Parse test output to extract failures
 */
function parseTestOutput(output: string, framework: TestFramework): TestFailure[] {
  switch (framework) {
    case 'vitest':
    case 'jest':
      return parseJestVitestOutput(output);

    case 'mocha':
      return parseMochaOutput(output);

    case 'pytest':
      return parsePytestOutput(output);

    default:
      return parseGenericOutput(output);
  }
}

/**
 * Parse Jest/Vitest output
 */
function parseJestVitestOutput(output: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const lines = output.split('\n');

  let currentTest = '';
  let currentError = '';
  let currentStack: string[] = [];
  let inErrorBlock = false;

  for (const line of lines) {
    // Test failure header
    if (line.match(/^[\s]*●/)) {
      if (currentTest && currentError) {
        failures.push({
          test: currentTest.trim(),
          error: currentError.trim(),
          stack: currentStack.join('\n'),
        });
      }
      currentTest = line.replace(/●/g, '').trim();
      currentError = '';
      currentStack = [];
      inErrorBlock = true;
    } else if (inErrorBlock) {
      // Error message or stack trace
      if (line.trim().startsWith('at ')) {
        currentStack.push(line.trim());
      } else if (line.trim()) {
        currentError += line + '\n';
      }
    }
  }

  // Add last failure
  if (currentTest && currentError) {
    failures.push({
      test: currentTest.trim(),
      error: currentError.trim(),
      stack: currentStack.join('\n'),
    });
  }

  return failures;
}

/**
 * Parse Mocha output
 */
function parseMochaOutput(output: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const lines = output.split('\n');

  let currentTest = '';
  let currentError = '';

  for (const line of lines) {
    if (line.match(/^\s+\d+\)/)) {
      if (currentTest) {
        failures.push({
          test: currentTest.trim(),
          error: currentError.trim(),
        });
      }
      currentTest = line.replace(/^\s+\d+\)/, '').trim();
      currentError = '';
    } else if (currentTest && line.trim().startsWith('Error:')) {
      currentError = line.trim();
    }
  }

  if (currentTest) {
    failures.push({
      test: currentTest.trim(),
      error: currentError.trim(),
    });
  }

  return failures;
}

/**
 * Parse Pytest output
 */
function parsePytestOutput(output: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const lines = output.split('\n');

  let currentTest = '';
  let currentError = '';
  let currentFile = '';

  for (const line of lines) {
    // FAILED test_file.py::test_name
    const failedMatch = line.match(/FAILED\s+(.+?)::(.+?)(\s|$)/);
    if (failedMatch) {
      currentFile = failedMatch[1] || '';
      currentTest = failedMatch[2] || '';
    }

    // Error lines
    if (line.startsWith('E       ')) {
      currentError += line.replace('E       ', '') + '\n';
    }

    // End of failure block
    if (line.match(/^={3,}/) && currentTest) {
      failures.push({
        test: currentTest.trim(),
        file: currentFile,
        error: currentError.trim(),
      });
      currentTest = '';
      currentError = '';
      currentFile = '';
    }
  }

  return failures;
}

/**
 * Parse generic test output
 */
function parseGenericOutput(output: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.toLowerCase().includes('fail') || line.toLowerCase().includes('error')) {
      failures.push({
        test: 'Unknown test',
        error: line.trim(),
      });
    }
  }

  return failures;
}

/**
 * Parse test statistics from output
 */
function parseTestStats(output: string, _framework: TestFramework): {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
} {
  // Default stats
  const stats = { passed: 0, failed: 0, skipped: 0, total: 0 };

  // Jest/Vitest: "Tests: 2 failed, 8 passed, 10 total"
  const jestMatch = output.match(/Tests:\s+(?:(\d+) failed,?\s*)?(?:(\d+) passed,?\s*)?(?:(\d+) skipped,?\s*)?(\d+) total/);
  if (jestMatch) {
    stats.failed = parseInt(jestMatch[1] || '0', 10);
    stats.passed = parseInt(jestMatch[2] || '0', 10);
    stats.skipped = parseInt(jestMatch[3] || '0', 10);
    stats.total = parseInt(jestMatch[4] || '0', 10);
    return stats;
  }

  // Pytest: "5 passed, 2 failed in 1.23s"
  const pytestMatch = output.match(/(\d+) passed(?:, (\d+) failed)?(?:, (\d+) skipped)?/);
  if (pytestMatch) {
    stats.passed = parseInt(pytestMatch[1] || '0', 10);
    stats.failed = parseInt(pytestMatch[2] || '0', 10);
    stats.skipped = parseInt(pytestMatch[3] || '0', 10);
    stats.total = stats.passed + stats.failed + stats.skipped;
    return stats;
  }

  return stats;
}

/**
 * Run tests and return results
 */
export async function runTests(cwd: string, options: TestOptions = {}): Promise<TestResult> {
  const framework = options.framework === 'auto' || !options.framework
    ? await detectTestFramework(cwd)
    : options.framework;

  const command = buildTestCommand(framework, options);
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 300000, // 5 minutes max
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    const output = stdout + stderr;
    const duration = Date.now() - startTime;
    const stats = parseTestStats(output, framework);
    const failures = parseTestOutput(output, framework);

    return {
      framework,
      ...stats,
      duration,
      failures,
      rawOutput: output,
      exitCode: 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    const output = (execError.stdout || '') + (execError.stderr || '');
    const stats = parseTestStats(output, framework);
    const failures = parseTestOutput(output, framework);

    return {
      framework,
      ...stats,
      duration,
      failures,
      rawOutput: output,
      exitCode: execError.code || 1,
    };
  }
}
