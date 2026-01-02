# Performance Guidelines

## File I/O Best Practices

### 1. Batch File Operations
```typescript
// ✅ Good - Read once
const content = await fs.readFile(path, 'utf-8');
const lines = content.split('\n');
processLines(lines);

// ❌ Bad - Multiple reads
for (const line of lines) {
  const content = await fs.readFile(path, 'utf-8');
}
```

### 2. Use Streams for Large Files
```typescript
import { createReadStream } from 'fs';

const stream = createReadStream(largefile);
stream.on('data', (chunk) => processChunk(chunk));
```

## Async Operation Batching

### Parallel When Independent
```typescript
// ✅ Good - Parallel execution
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
]);

// ❌ Bad - Sequential execution
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);
```

## Caching Strategies

### 1. Memoization
```typescript
let cached: Data | null = null;

export async function getData(): Promise<Data> {
  if (cached) return cached;

  cached = await loadData();
  return cached;
}
```

### 2. Use Smart Cache
```typescript
import { getCache, setCache } from '../cache/index.js';

const cached = await getCache({
  type: 'expensive_op',
  identifier: id,
  version: '1.0.0',
});

if (cached) return cached;

const result = await expensiveOperation();
await setCache({ type: 'expensive_op', identifier: id }, result);
```

## Database Query Optimization

### Use Parameterized Queries
```typescript
// ✅ Good - Parameterized
await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ Bad - String concatenation (also security risk!)
await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Limit Results
```typescript
// ✅ Good - Limited
await db.query('SELECT * FROM logs LIMIT 100');

// ❌ Bad - Full scan
await db.query('SELECT * FROM logs'); // millions of rows
```

## Memory Management

### 1. Clean Up Large Objects
```typescript
async function processLargeData() {
  let largeData = await loadLargeData();

  const result = processData(largeData);

  largeData = null; // Allow GC

  return result;
}
```

### 2. Avoid Memory Leaks
```typescript
// ✅ Good - Cleanup listeners
const cleanup = () => {
  emitter.removeListener('event', handler);
};

process.on('exit', cleanup);
```

## Lazy Loading

### Load Dependencies When Needed
```typescript
// ✅ Good - Lazy load
export async function usePostgres() {
  const { createPostgresClient } = await import('./database/postgres.js');
  return createPostgresClient(config);
}

// ❌ Bad - Always loaded
import { createPostgresClient } from './database/postgres.js';
```

## Array Operations

### Use Efficient Methods
```typescript
// ✅ Good - Single pass
const result = items.filter(x => x.active).map(x => x.name);

// ❌ Bad - Multiple passes
const active = items.filter(x => x.active);
const names = active.map(x => x.name);
```

## JSON Operations

### Parse Once
```typescript
// ✅ Good
const data = JSON.parse(content);
processUser(data.user);
processPosts(data.posts);

// ❌ Bad
const user = JSON.parse(content).user;
const posts = JSON.parse(content).posts;
```

## Performance Monitoring

### Track Execution Time
```typescript
const startTime = Date.now();
await operation();
const duration = Date.now() - startTime;

await trackToolExecution(sessionId, 'tool_name', duration, true);
```

## When to Optimize

1. **Profile first** - Measure before optimizing
2. **Optimize hot paths** - Focus on frequently called code
3. **Consider trade-offs** - Don't sacrifice readability for micro-optimizations
4. **Use caching** - For expensive, repeated operations
5. **Batch operations** - When possible, reduce I/O calls
