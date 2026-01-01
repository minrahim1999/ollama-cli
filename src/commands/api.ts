/**
 * API command - HTTP client and API testing
 */

import { executeRequest, validateResponse } from '../api/http.js';
import type { HttpRequest, HttpMethod, ApiTest, ApiTestResult } from '../types/api.js';
import { displayError, displaySuccess } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';
import fs from 'fs/promises';
import path from 'path';

export type ApiCommand = 'request' | 'test';

interface ApiOptions {
  method?: HttpMethod | undefined;
  header?: string[] | undefined;
  data?: string | undefined;
  file?: string | undefined;
  timeout?: number | undefined;
}

/**
 * Main API command handler
 */
export async function apiCommand(
  command: ApiCommand,
  args: string[],
  options: ApiOptions
): Promise<void> {
  switch (command) {
    case 'request':
      if (args.length === 0) {
        displayError('Usage: ollama-cli api request <url>');
        return;
      }
      await requestCmd(args[0]!, options);
      break;

    case 'test':
      if (args.length === 0 && !options.file) {
        displayError('Usage: ollama-cli api test <test-file.json>');
        return;
      }
      const testFile = options.file || args[0]!;
      await testCmd(testFile);
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: request, test');
  }
}

/**
 * Execute HTTP request
 */
async function requestCmd(url: string, options: ApiOptions): Promise<void> {
  try {
    // Parse headers
    const headers: Record<string, string> = {};
    if (options.header) {
      for (const header of options.header) {
        const [key, ...valueParts] = header.split(':');
        if (key && valueParts.length > 0) {
          headers[key.trim()] = valueParts.join(':').trim();
        }
      }
    }

    // Parse body data
    let body: string | Record<string, unknown> | undefined;
    if (options.data) {
      try {
        body = JSON.parse(options.data);
      } catch {
        body = options.data;
      }
    }

    const request: HttpRequest = {
      url,
      method: options.method || 'GET',
      headers,
      body,
      timeout: options.timeout,
    };

    startSpinner(`${request.method} ${url}`);

    const response = await executeRequest(request);

    stopSpinner();

    console.log('');
    console.log(gradients.brand('HTTP Response'));
    console.log('');

    // Status
    const statusColor = response.status < 300 ? colors.success : response.status < 500 ? colors.warning : colors.error;
    console.log(statusColor(`${response.status} ${response.statusText}`));
    console.log(colors.dim(`Duration: ${response.timing.duration}ms`));
    console.log('');

    // Headers
    console.log(colors.secondary('Headers:'));
    for (const [key, value] of Object.entries(response.headers)) {
      console.log(`  ${colors.brand.primary(key)}: ${colors.tertiary(value)}`);
    }
    console.log('');

    // Body
    console.log(colors.secondary('Body:'));
    if (response.json) {
      console.log(colors.tertiary(JSON.stringify(response.json, null, 2)));
    } else {
      const preview = response.body.substring(0, 500);
      console.log(colors.tertiary(preview));
      if (response.body.length > 500) {
        console.log(colors.dim(`\n... and ${response.body.length - 500} more characters`));
      }
    }
    console.log('');
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Request failed');
  }
}

/**
 * Run API test suite
 */
async function testCmd(testFile: string): Promise<void> {
  try {
    const filePath = path.resolve(process.cwd(), testFile);
    const content = await fs.readFile(filePath, 'utf-8');
    const tests = JSON.parse(content) as ApiTest[];

    console.log('');
    console.log(gradients.brand('Running API Tests'));
    console.log('');
    console.log(colors.secondary(`Tests: ${tests.length}`));
    console.log('');

    const results: ApiTestResult[] = [];

    for (const test of tests) {
      startSpinner(`Running: ${test.name}`);

      const testStart = Date.now();
      const response = await executeRequest(test.request);

      const validations = test.validation
        ? validateResponse(response, test.validation)
        : [];

      const passed = validations.length === 0 || validations.every(v => v.passed);

      stopSpinner();

      const icon = passed ? '✅' : '❌';
      console.log(`${icon} ${colors.secondary(test.name)} ${colors.dim(`(${response.timing.duration}ms)`)}`);

      if (validations.length > 0) {
        for (const validation of validations) {
          const validIcon = validation.passed ? '  ✓' : '  ✗';
          const color = validation.passed ? colors.success : colors.error;
          console.log(`${validIcon} ${color(validation.message)}`);
        }
      }

      console.log('');

      results.push({
        test: test.name,
        request: test.request,
        response,
        validations,
        passed,
        duration: Date.now() - testStart,
      });
    }

    // Summary
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(colors.secondary('Summary:'));
    console.log(colors.success(`  Passed: ${passedCount}`));
    if (failedCount > 0) {
      console.log(colors.error(`  Failed: ${failedCount}`));
    }
    console.log(colors.dim(`  Total Duration: ${totalDuration}ms`));
    console.log('');

    if (failedCount === 0) {
      displaySuccess('All tests passed!');
    } else {
      displayError(`${failedCount} test(s) failed`);
    }
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Test execution failed');
  }
}
