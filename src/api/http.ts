/**
 * HTTP client for API testing
 */

import type { HttpRequest, HttpResponse, ValidationRule, ValidationResult } from '../types/api.js';

/**
 * Execute HTTP request
 */
export async function executeRequest(request: HttpRequest): Promise<HttpResponse> {
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Ollama-CLI-API-Test/1.0',
      ...request.headers,
    };

    // Add Content-Type for JSON body
    if (request.body && typeof request.body === 'object') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const controller = new AbortController();
    const timeout = request.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: controller.signal,
    };

    if (request.body) {
      fetchOptions.body = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);
    }

    const response = await fetch(request.url, fetchOptions);

    clearTimeout(timeoutId);

    const endTime = Date.now();
    const responseBody = await response.text();

    // Parse JSON if possible
    let jsonData: unknown = undefined;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        jsonData = JSON.parse(responseBody);
      } catch {
        // Not valid JSON, ignore
      }
    }

    // Collect headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      json: jsonData,
      timing: {
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate HTTP response against rules
 */
export function validateResponse(response: HttpResponse, rules: ValidationRule[]): ValidationResult[] {
  return rules.map(rule => {
    try {
      return executeValidation(response, rule);
    } catch (error) {
      return {
        rule,
        passed: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  });
}

/**
 * Execute a single validation rule
 */
function executeValidation(response: HttpResponse, rule: ValidationRule): ValidationResult {
  switch (rule.type) {
    case 'status':
      return validateStatus(response, rule);

    case 'header':
      return validateHeader(response, rule);

    case 'body':
      return validateBody(response, rule);

    case 'json-path':
      return validateJsonPath(response, rule);

    case 'schema':
      return validateSchema(response, rule);

    default:
      return {
        rule,
        passed: false,
        message: `Unknown validation type: ${rule.type}`,
      };
  }
}

/**
 * Validate HTTP status code
 */
function validateStatus(response: HttpResponse, rule: ValidationRule): ValidationResult {
  const actual = response.status;
  const expected = rule.value as number;

  let passed = false;
  let message = '';

  switch (rule.operator) {
    case 'equals':
      passed = actual === expected;
      message = passed ? `Status is ${actual}` : `Expected status ${expected}, got ${actual}`;
      break;

    case 'gt':
      passed = actual > expected;
      message = passed ? `Status ${actual} > ${expected}` : `Expected status > ${expected}, got ${actual}`;
      break;

    case 'lt':
      passed = actual < expected;
      message = passed ? `Status ${actual} < ${expected}` : `Expected status < ${expected}, got ${actual}`;
      break;

    default:
      message = `Invalid operator for status: ${rule.operator}`;
  }

  return { rule, passed, message };
}

/**
 * Validate HTTP header
 */
function validateHeader(response: HttpResponse, rule: ValidationRule): ValidationResult {
  if (!rule.field) {
    return { rule, passed: false, message: 'Header name not specified' };
  }

  const headerValue = response.headers[rule.field.toLowerCase()];

  let passed = false;
  let message = '';

  switch (rule.operator) {
    case 'exists':
      passed = headerValue !== undefined;
      message = passed ? `Header '${rule.field}' exists` : `Header '${rule.field}' not found`;
      break;

    case 'equals':
      passed = headerValue === rule.value;
      message = passed
        ? `Header '${rule.field}' equals '${rule.value}'`
        : `Expected '${rule.value}', got '${headerValue}'`;
      break;

    case 'contains':
      passed = headerValue?.includes(String(rule.value)) ?? false;
      message = passed
        ? `Header '${rule.field}' contains '${rule.value}'`
        : `Header '${rule.field}' does not contain '${rule.value}'`;
      break;

    default:
      message = `Invalid operator for header: ${rule.operator}`;
  }

  return { rule, passed, message };
}

/**
 * Validate response body
 */
function validateBody(response: HttpResponse, rule: ValidationRule): ValidationResult {
  const body = response.body;

  let passed = false;
  let message = '';

  switch (rule.operator) {
    case 'contains':
      passed = body.includes(String(rule.value));
      message = passed ? `Body contains '${rule.value}'` : `Body does not contain '${rule.value}'`;
      break;

    case 'matches':
      const regex = new RegExp(String(rule.value));
      passed = regex.test(body);
      message = passed ? `Body matches pattern '${rule.value}'` : `Body does not match pattern '${rule.value}'`;
      break;

    default:
      message = `Invalid operator for body: ${rule.operator}`;
  }

  return { rule, passed, message };
}

/**
 * Validate JSON path
 */
function validateJsonPath(response: HttpResponse, rule: ValidationRule): ValidationResult {
  if (!response.json) {
    return { rule, passed: false, message: 'Response is not JSON' };
  }

  if (!rule.field) {
    return { rule, passed: false, message: 'JSON path not specified' };
  }

  // Simple JSON path evaluation (supports dot notation: user.name)
  const value = getJsonPath(response.json, rule.field);

  let passed = false;
  let message = '';

  switch (rule.operator) {
    case 'exists':
      passed = value !== undefined;
      message = passed ? `Path '${rule.field}' exists` : `Path '${rule.field}' not found`;
      break;

    case 'equals':
      passed = value === rule.value;
      message = passed
        ? `Path '${rule.field}' equals '${rule.value}'`
        : `Expected '${rule.value}', got '${value}'`;
      break;

    default:
      message = `Invalid operator for json-path: ${rule.operator}`;
  }

  return { rule, passed, message };
}

/**
 * Get value from JSON path
 */
function getJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Validate JSON schema (basic implementation)
 */
function validateSchema(response: HttpResponse, rule: ValidationRule): ValidationResult {
  if (!response.json) {
    return { rule, passed: false, message: 'Response is not JSON' };
  }

  // Basic schema validation (could be extended with a library like ajv)
  return {
    rule,
    passed: true,
    message: 'Schema validation not fully implemented',
  };
}
