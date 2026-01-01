/**
 * Structured Outputs - JSON schema validation for AI responses
 */

import type { Message } from '../types/index.js';

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema> | undefined;
  items?: JSONSchema | undefined;
  required?: string[] | undefined;
  enum?: unknown[] | undefined;
  description?: string | undefined;
}

export interface StructuredOutputConfig {
  schema: JSONSchema;
  strict?: boolean | undefined; // Enforce strict validation
}

/**
 * Validate JSON against schema
 */
export function validateJSON(data: unknown, schema: JSONSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  function validate(value: unknown, s: JSONSchema, path: string = 'root'): void {
    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (s.type && actualType !== s.type && s.type !== 'object') {
      if (!(s.type === 'object' && actualType === 'object')) {
        errors.push(`${path}: Expected ${s.type}, got ${actualType}`);
        return;
      }
    }

    // Enum validation
    if (s.enum && !s.enum.includes(value)) {
      errors.push(`${path}: Value must be one of ${JSON.stringify(s.enum)}`);
    }

    // Object properties
    if (s.type === 'object' && s.properties && typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;

      // Check required properties
      if (s.required) {
        for (const req of s.required) {
          if (!(req in obj)) {
            errors.push(`${path}: Missing required property "${req}"`);
          }
        }
      }

      // Validate each property
      for (const [key, propSchema] of Object.entries(s.properties)) {
        if (key in obj) {
          validate(obj[key], propSchema, `${path}.${key}`);
        }
      }
    }

    // Array items
    if (s.type === 'array' && Array.isArray(value) && s.items) {
      value.forEach((item, index) => {
        validate(item, s.items!, `${path}[${index}]`);
      });
    }
  }

  validate(data, schema);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate system prompt for structured output
 */
export function getStructuredOutputPrompt(schema: JSONSchema): string {
  return `

## Structured Output Requirement

You MUST respond with valid JSON that matches this schema:

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

IMPORTANT:
- Your response must be ONLY valid JSON
- Do not include any explanation or markdown
- Follow the schema exactly
- Include all required fields
- Use correct data types
`;
}

/**
 * Augment messages for structured output
 */
export function augmentMessagesForStructured(
  messages: Message[],
  config: StructuredOutputConfig
): Message[] {
  // Find or create system message
  const systemIndex = messages.findIndex((m) => m.role === 'system');
  const structuredPrompt = getStructuredOutputPrompt(config.schema);

  if (systemIndex >= 0) {
    const updated = [...messages];
    updated[systemIndex] = {
      ...updated[systemIndex]!,
      content: updated[systemIndex]!.content + structuredPrompt,
    };
    return updated;
  }

  return [
    {
      role: 'system',
      content: structuredPrompt,
    },
    ...messages,
  ];
}

/**
 * Parse and validate structured response
 */
export function parseStructuredResponse(
  response: string,
  schema: JSONSchema,
  strict: boolean = false
): { success: boolean; data?: unknown; errors?: string[] } {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1]! : response;

    const data = JSON.parse(jsonText);
    const validation = validateJSON(data, schema);

    if (validation.valid) {
      return {
        success: true,
        data,
      };
    } else if (!strict) {
      return {
        success: true,
        data,
        errors: validation.errors,
      };
    }

    return {
      success: false,
      errors: validation.errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Common schema templates
 */
export const SCHEMA_TEMPLATES = {
  codeReview: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
            line: { type: 'number' },
            message: { type: 'string' },
            suggestion: { type: 'string' },
          },
          required: ['severity', 'message'],
        },
      },
      summary: { type: 'string' },
    },
    required: ['issues', 'summary'],
  },

  todoList: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            estimate: { type: 'string' },
          },
          required: ['title', 'priority'],
        },
      },
    },
    required: ['tasks'],
  },

  apiResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['success', 'error'] },
      data: { type: 'object' },
      message: { type: 'string' },
    },
    required: ['status'],
  },
} as const;
