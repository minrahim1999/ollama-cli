/**
 * Tests for Context Management
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultContextConfig,
  estimateTokens,
  matchesRules,
  filterMessages,
  getContextStats,
  addContextRule,
  setTokenBudget,
} from './index.js';
import type { Message } from '../types/index.js';

describe('Context Management', () => {
  describe('getDefaultContextConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultContextConfig();

      expect(config.rules).toEqual([]);
      expect(config.tokenBudget).toBeUndefined();
      expect(config.autoSummarize).toBe(false);
      expect(config.includeFiles).toBe(true);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const text = 'This is a test message';
      const tokens = estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should handle empty string', () => {
      const tokens = estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('matchesRules', () => {
    it('should match include rules', () => {
      const rules = [{ type: 'include' as const, pattern: 'src/**/*.ts' }];
      expect(matchesRules('src/index.ts', rules)).toBe(true);
      expect(matchesRules('test.js', rules)).toBe(false);
    });

    it('should match exclude rules', () => {
      const rules = [
        { type: 'include' as const, pattern: '**/*.ts' },
        { type: 'exclude' as const, pattern: '**/*.test.ts' },
      ];

      expect(matchesRules('src/index.ts', rules)).toBe(true);
      expect(matchesRules('src/index.test.ts', rules)).toBe(false);
    });

    it('should handle no rules', () => {
      expect(matchesRules('any-file.ts', [])).toBe(false);
    });
  });

  describe('filterMessages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Short message', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'A'.repeat(1000), timestamp: new Date().toISOString() },
      { role: 'user', content: 'Another message', timestamp: new Date().toISOString() },
    ];

    it('should filter messages by token budget', () => {
      const config = getDefaultContextConfig();
      config.tokenBudget = 100;

      const filtered = filterMessages(messages, config);
      const included = filtered.filter((m) => m.included);

      expect(included.length).toBeLessThan(messages.length);
    });

    it('should include all messages without budget', () => {
      const config = getDefaultContextConfig();
      const filtered = filterMessages(messages, config);
      const included = filtered.filter((m) => m.included);

      expect(included.length).toBe(messages.length);
    });

    it('should filter by message age', () => {
      const oldMessage: Message = {
        role: 'user',
        content: 'Old message',
        timestamp: new Date(Date.now() - 10000000).toISOString(),
      };

      const config = getDefaultContextConfig();
      config.maxMessageAge = 1000; // 1 second

      const filtered = filterMessages([oldMessage], config);
      expect(filtered[0]?.included).toBe(false);
      expect(filtered[0]?.reason).toBe('Message too old');
    });
  });

  describe('getContextStats', () => {
    it('should calculate statistics', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' },
      ];

      const config = getDefaultContextConfig();
      const stats = getContextStats(messages, config);

      expect(stats.totalMessages).toBe(2);
      expect(stats.includedMessages).toBe(2);
      expect(stats.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('addContextRule', () => {
    it('should add include rule', () => {
      const config = getDefaultContextConfig();
      const updated = addContextRule(config, 'include', 'src/**/*.ts');

      expect(updated.rules).toHaveLength(1);
      expect(updated.rules[0]?.type).toBe('include');
      expect(updated.rules[0]?.pattern).toBe('src/**/*.ts');
    });

    it('should add multiple rules', () => {
      let config = getDefaultContextConfig();
      config = addContextRule(config, 'include', 'src/**/*.ts');
      config = addContextRule(config, 'exclude', '**/*.test.ts');

      expect(config.rules).toHaveLength(2);
    });
  });

  describe('setTokenBudget', () => {
    it('should set token budget', () => {
      const config = getDefaultContextConfig();
      const updated = setTokenBudget(config, 5000);

      expect(updated.tokenBudget).toBe(5000);
    });

    it('should clear token budget', () => {
      let config = getDefaultContextConfig();
      config = setTokenBudget(config, 5000);
      config = setTokenBudget(config, undefined);

      expect(config.tokenBudget).toBeUndefined();
    });
  });
});
