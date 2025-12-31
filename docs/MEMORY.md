# Memory & Snapshot System

The Ollama CLI includes a powerful memory system that tracks all file changes, creates automatic snapshots, and allows you to revert to previous states.

## Overview

The memory system provides:
- **Automatic Snapshots**: Created before any file modification
- **Change Tracking**: Complete history of all file operations
- **Diff Generation**: See what changed between versions
- **Rollback**: Revert files to previous states
- **Session Linking**: Snapshots linked to chat sessions

## Storage Location

Snapshots are stored in:
```
~/.ollama-cli/snapshots/<snapshot-id>.json
```

Each snapshot contains:
- Unique ID
- Timestamp
- Reason for creation
- Complete file contents
- File hashes and metadata
- Session ID (if applicable)

## Automatic Snapshots

Snapshots are automatically created before:
- `write_file` - Writing/overwriting files
- `edit_file` - Editing files
- `copy_file` - Copying files
- `move_file` - Moving/renaming files
- `delete_file` - Deleting files

Example:
```
Executing tool: write_file...
Tool executed successfully
Snapshot created: a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6
```

## Chat Commands

### List Snapshots

View snapshot history for current session:

```
/snapshots
```

Output:
```
Snapshot History (15):
─────────────────────────────────────────────────
ID: a1b2c3d4...
  Time: 2026-01-01 10:30:15
  Reason: Before write_file
  Files: 1

ID: b2c3d4e5...
  Time: 2026-01-01 10:28:42
  Reason: Before edit_file
  Files: 2
...
```

### View Differences

Show what changed in a snapshot:

```
/diff <snapshot-id>
```

Compare two snapshots:

```
/diff <snapshot-id> <previous-snapshot-id>
```

Output:
```
Snapshot: a1b2c3d4
Timestamp: 2026-01-01 10:30:15

Changes:
  Added: 0 file(s)
  Modified: 1 file(s)
  Deleted: 0 file(s)

~ src/config.ts

================================================================================

File: src/config.ts (modified)
--------------------------------------------------------------------------------
--- src/config.ts
+++ src/config.ts
@@ -10,7 +10,7 @@
 export const config = {
-  port: 3000,
+  port: 8080,
   host: 'localhost',
```

### Revert to Snapshot

Restore files to a previous state:

```
/revert <snapshot-id>
```

This will:
1. Create a backup snapshot (before reverting)
2. Restore all files from the specified snapshot
3. Show which files were reverted

Output:
```
Reverting to snapshot:
  ID: a1b2c3d4
  Time: 2026-01-01 10:30:15
  Files: 2

✓ Reverted 2 file(s)
```

### Cleanup Old Snapshots

Remove old snapshots (keeps last 10 per session):

```
/cleanup
```

Output:
```
✓ Cleaned up 25 old snapshot(s)
```

## Programmatic Usage

### Create Snapshot

```typescript
import { createSnapshot } from 'ollama-cli';

const snapshot = await createSnapshot({
  reason: 'Manual backup',
  files: ['src/index.ts', 'src/config.ts'],
  workingDirectory: process.cwd(),
  sessionId: 'optional-session-id'
});

console.log('Snapshot ID:', snapshot.id);
```

### List Snapshots

```typescript
import { listSnapshots } from 'ollama-cli';

// All snapshots
const allSnapshots = await listSnapshots();

// Snapshots for specific session
const sessionSnapshots = await listSnapshots('session-id');

for (const snapshot of sessionSnapshots) {
  console.log(snapshot.id, snapshot.timestamp, snapshot.reason);
}
```

### Load Snapshot

```typescript
import { loadSnapshot } from 'ollama-cli';

const snapshot = await loadSnapshot('snapshot-id');

if (snapshot) {
  console.log('Files in snapshot:', snapshot.files.length);
  for (const file of snapshot.files) {
    console.log(file.path, file.size, file.hash);
  }
}
```

### Generate Diff

```typescript
import { compareSnapshots, formatFullDiff } from 'ollama-cli';

const diff = await compareSnapshots(
  'current-snapshot-id',
  'previous-snapshot-id'
);

console.log('Files added:', diff.summary.filesAdded);
console.log('Files modified:', diff.summary.filesModified);
console.log('Files deleted:', diff.summary.filesDeleted);

// Print full diff
console.log(formatFullDiff(diff));
```

### Revert to Snapshot

```typescript
import { revertToSnapshot } from 'ollama-cli';

const result = await revertToSnapshot({
  snapshotId: 'snapshot-to-revert-to',
  createBackup: true, // Create backup before reverting
  files: ['src/index.ts'] // Optional: only revert specific files
});

if (result.success) {
  console.log('Reverted files:', result.filesReverted);
} else {
  console.log('Errors:', result.errors);
}
```

### Cleanup

```typescript
import { cleanOldSnapshots } from 'ollama-cli';

// Keep last 10 snapshots per session
const deletedCount = await cleanOldSnapshots(10);

console.log(`Deleted ${deletedCount} old snapshots`);
```

## Snapshot Structure

Each snapshot JSON contains:

```json
{
  "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
  "sessionId": "optional-session-id",
  "timestamp": "2026-01-01T10:30:15.000Z",
  "reason": "Before write_file",
  "files": [
    {
      "path": "/absolute/path/to/file.ts",
      "content": "file contents...",
      "hash": "sha256-hash",
      "size": 1234,
      "mtime": "2026-01-01T10:29:00.000Z"
    }
  ],
  "metadata": {
    "toolUsed": "write_file",
    "userMessage": "optional user message",
    "workingDirectory": "/path/to/project"
  }
}
```

## Best Practices

### 1. Regular Cleanup

Run cleanup periodically to avoid excessive disk usage:

```bash
ollama-cli chat --tools
> /cleanup
```

### 2. Name Important Snapshots

When creating manual snapshots, use descriptive reasons:

```typescript
await createSnapshot({
  reason: 'Before major refactoring',
  files: ['src/**/*.ts'],
  workingDirectory: process.cwd()
});
```

### 3. Review Before Reverting

Always check the diff before reverting:

```
/diff <snapshot-id>
/revert <snapshot-id>
```

### 4. Backup Critical Changes

For important file operations, create manual snapshots:

```typescript
// Before dangerous operation
const backup = await createSnapshot({
  reason: 'Pre-deployment backup',
  files: criticalFiles,
  workingDirectory: projectDir
});

// Perform operation
performDangerousOperation();

// If something goes wrong
if (errorOccurred) {
  await revertToSnapshot({
    snapshotId: backup.id,
    createBackup: false
  });
}
```

### 5. Link to Sessions

Keep snapshots organized by linking to sessions:

```typescript
const snapshot = await createSnapshot({
  reason: 'Code generation',
  sessionId: chatSession.id,
  files: generatedFiles,
  workingDirectory: projectDir
});
```

## Limitations

- **Storage**: Snapshots store full file contents, so they can use disk space
- **Scope**: Only tracks files explicitly passed to tools
- **Binary Files**: Best for text files; binary files are stored but diffs won't be readable
- **Performance**: Large files or many snapshots may slow operations

## Troubleshooting

### Snapshot Not Created

If a snapshot wasn't created:
- Check if the tool is configured with `needsSnapshot: true`
- Ensure files exist and are readable
- Check disk space

### Revert Failed

If revert fails:
- Check file permissions
- Ensure target paths are writable
- Review error messages for specific files

### Large Snapshot Size

If snapshots are too large:
- Clean up old snapshots: `/cleanup`
- Limit files passed to tools
- Exclude large binary files

## Integration with Tools

The memory system integrates seamlessly with tools:

```
User: Can you update the port in config.ts to 8080?