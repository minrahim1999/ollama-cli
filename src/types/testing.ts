/**
 * Test integration type definitions
 */

export type TestFramework = 'vitest' | 'jest' | 'mocha' | 'pytest' | 'npm' | 'auto';

export interface TestFailure {
  test: string;
  file?: string | undefined;
  line?: number | undefined;
  error: string;
  stack?: string | undefined;
  expected?: string | undefined;
  actual?: string | undefined;
}

export interface TestResult {
  framework: TestFramework;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failures: TestFailure[];
  rawOutput: string;
  exitCode: number;
}

export interface TestOptions {
  framework?: TestFramework;
  file?: string; // Specific test file to run
  pattern?: string; // Test pattern/filter
  watch?: boolean;
  verbose?: boolean;
}
