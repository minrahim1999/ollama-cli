/**
 * API testing type definitions
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface HttpRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string> | undefined;
  body?: string | Record<string, unknown> | undefined;
  timeout?: number | undefined;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  json?: unknown | undefined;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
}

export interface ApiTest {
  name: string;
  request: HttpRequest;
  validation?: ValidationRule[] | undefined;
}

export interface ValidationRule {
  type: 'status' | 'header' | 'body' | 'json-path' | 'schema';
  field?: string | undefined;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'gt' | 'lt';
  value?: unknown;
}

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  message: string;
}

export interface ApiTestResult {
  test: string;
  request: HttpRequest;
  response: HttpResponse;
  validations: ValidationResult[];
  passed: boolean;
  duration: number;
}
