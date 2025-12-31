/**
 * Display utilities tests
 */

import { describe, it, expect } from 'vitest';
import { formatBytes, formatRelativeTime } from './display.js';

describe('Display Utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0.0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent time as "just now"', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('5 mins ago');
    });

    it('should format hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('2 hours ago');
    });

    it('should format days ago', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(date)).toBe('3 days ago');
    });
  });
});
