# API Documentation

This document describes the programmatic API for Ollama CLI. You can use these modules in your own Node.js applications.

## Installation

```bash
npm install ollama-cli
```

## Importing

```typescript
import {
  OllamaClient,
  loadConfig,
  createSession,
  type ChatSession,
  type Message
} from 'ollama-cli';
```

## OllamaClient

The main client for interacting with the Ollama API.

### Constructor

```typescript
const client = new OllamaClient(baseUrl: string, timeoutMs?: number);
```

**Parameters:**
- `baseUrl` - Ollama API base URL (e.g., `http://localhost:11434/api`)
- `timeoutMs` - Optional request timeout in milliseconds (default: 30000)

### Methods

#### chat(params)

Stream chat responses from Ollama.

```typescript
async *chat(params: ChatRequestParams): AsyncGenerator<string, void, unknown>
```

**Example:**
```typescript
const client = new OllamaClient('http://localhost:11434/api');

for await (const chunk of client.chat({
  model: 'llama2',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})) {
  process.stdout.write(chunk);
}
```

#### generate(params)

Generate a one-shot response (non-streaming).

```typescript
async generate(params: GenerateRequestParams): Promise<GenerateResponse>
```

**Example:**
```typescript
const response = await client.generate({
  model: 'llama2',
  prompt: 'What is AI?'
});

console.log(response.response);
```

#### listModels()

List available Ollama models.

```typescript
async listModels(): Promise<ModelsResponse>
```

**Example:**
```typescript
const { models } = await client.listModels();

for (const model of models) {
  console.log(model.name);
}
```

## Configuration

### loadConfig()

Load configuration from file.

```typescript
async loadConfig(): Promise<OllamaConfig>
```

### saveConfig(config)

Save configuration to file.

```typescript
async saveConfig(config: Partial<OllamaConfig>): Promise<void>
```

### getEffectiveConfig()

Get configuration with environment variable overrides.

```typescript
async getEffectiveConfig(): Promise<OllamaConfig>
```

**Example:**
```typescript
import { loadConfig, saveConfig } from 'ollama-cli';

// Load config
const config = await loadConfig();
console.log(config.defaultModel);

// Update config
await saveConfig({ defaultModel: 'mistral' });
```

## Session Management

### createSession(model, name?)

Create a new chat session.

```typescript
async createSession(model: string, name?: string): Promise<ChatSession>
```

### loadSession(sessionId)

Load an existing session.

```typescript
async loadSession(sessionId: string): Promise<ChatSession | null>
```

### saveSession(session)

Save a session to disk.

```typescript
async saveSession(session: ChatSession): Promise<void>
```

### listSessions()

List all available sessions.

```typescript
async listSessions(): Promise<ChatSession[]>
```

### addMessage(session, message)

Add a message to a session.

```typescript
async addMessage(session: ChatSession, message: Message): Promise<ChatSession>
```

**Example:**
```typescript
import { createSession, addMessage, saveSession } from 'ollama-cli';

// Create session
let session = await createSession('llama2', 'my-chat');

// Add messages
session = await addMessage(session, {
  role: 'user',
  content: 'Hello!'
});

session = await addMessage(session, {
  role: 'assistant',
  content: 'Hi there! How can I help you?'
});

// Save session
await saveSession(session);
```

## Types

### OllamaConfig

```typescript
interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
}
```

### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### ChatSession

```typescript
interface ChatSession {
  id: string;
  name?: string;
  model: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
```

### ChatRequestParams

```typescript
interface ChatRequestParams {
  model: string;
  messages: Message[];
  stream?: boolean;
  format?: {
    type: 'json';
    schema?: Record<string, unknown>;
  };
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}
```

## Error Handling

All methods may throw errors. Always wrap in try-catch:

```typescript
try {
  const response = await client.generate({
    model: 'llama2',
    prompt: 'Hello'
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

Common errors:
- `Cannot connect to Ollama` - Ollama is not running
- `Request timed out` - Request exceeded timeout
- `Model not found` - Specified model doesn't exist
- `Invalid JSON schema` - Schema validation failed
