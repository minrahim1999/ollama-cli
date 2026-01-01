/**
 * Tests for Diff-Based Code Application
 */

import { describe, it, expect } from 'vitest';
import { generateDiff, parseDiff, extractFilePath } from './index.js';

describe('Diff-Based Code Application', () => {
  describe('generateDiff', () => {
    it('should generate diff between two strings', async () => {
      const oldContent = 'line 1\nline 2\nline 3';
      const newContent = 'line 1\nmodified line 2\nline 3';

      const diff = await generateDiff(oldContent, newContent, 'test.ts');

      expect(diff).toContain('--- a/test.ts');
      expect(diff).toContain('+++ b/test.ts');
      expect(diff).toContain('modified');
    });

    it('should handle identical content', async () => {
      const content = 'same content';
      const diff = await generateDiff(content, content, 'test.ts');

      expect(diff).toBe('');
    });

    it('should handle empty files', async () => {
      const diff = await generateDiff('', 'new content', 'test.ts');

      expect(diff).toContain('new content');
    });
  });

  describe('extractFilePath', () => {
    it('should extract file path from diff', () => {
      const diff = '--- a/src/index.ts\n+++ b/src/index.ts\n@@...';
      const filePath = extractFilePath(diff);

      expect(filePath).toBe('src/index.ts');
    });

    it('should return null for invalid diff', () => {
      const diff = 'invalid diff content';
      const filePath = extractFilePath(diff);

      expect(filePath).toBeNull();
    });
  });

  describe('parseDiff', () => {
    it('should parse unified diff format', () => {
      const diffContent = `--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,3 @@
 line 1
-line 2
+modified line 2
 line 3`;

      const diffs = parseDiff(diffContent);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]?.oldPath).toBe('test.ts');
      expect(diffs[0]?.newPath).toBe('test.ts');
      expect(diffs[0]?.hunks).toHaveLength(1);
    });

    it('should parse multiple files', () => {
      const diffContent = `--- a/file1.ts
+++ b/file1.ts
@@ -1,1 +1,1 @@
-old
+new
--- a/file2.ts
+++ b/file2.ts
@@ -1,1 +1,1 @@
-old2
+new2`;

      const diffs = parseDiff(diffContent);

      expect(diffs).toHaveLength(2);
      expect(diffs[0]?.oldPath).toBe('file1.ts');
      expect(diffs[1]?.oldPath).toBe('file2.ts');
    });

    it('should handle empty diff', () => {
      const diffs = parseDiff('');
      expect(diffs).toEqual([]);
    });
  });
});
