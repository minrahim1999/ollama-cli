/**
 * Generator Registry Tests
 */

import { describe, it, expect } from 'vitest';
import {
  findGenerator,
  getAllGenerators,
  getGeneratorsByType,
  getGeneratorsByFramework,
} from './registry.js';

describe('Generator Registry', () => {
  describe('findGenerator', () => {
    it('should find Express API generator with TypeScript', () => {
      const generator = findGenerator('api', 'express', 'typescript');

      expect(generator).toBeDefined();
      expect(generator?.type).toBe('api');
      expect(generator?.framework).toBe('express');
      expect(generator?.language).toBe('typescript');
    });

    it('should find Express API generator with JavaScript', () => {
      const generator = findGenerator('api', 'express', 'javascript');

      expect(generator).toBeDefined();
      expect(generator?.type).toBe('api');
      expect(generator?.framework).toBe('express');
      expect(generator?.language).toBe('javascript');
    });

    it('should find Express Auth generator', () => {
      const generator = findGenerator('auth', 'express', 'typescript');

      expect(generator).toBeDefined();
      expect(generator?.type).toBe('auth');
      expect(generator?.framework).toBe('express');
    });

    it('should return null for non-existent generator', () => {
      const generator = findGenerator('api', 'django', 'python');

      expect(generator).toBeNull();
    });
  });

  describe('getAllGenerators', () => {
    it('should return all generators', () => {
      const generators = getAllGenerators();

      expect(generators.length).toBeGreaterThan(0);
      expect(Array.isArray(generators)).toBe(true);
    });

    it('should include required properties', () => {
      const generators = getAllGenerators();

      generators.forEach((gen) => {
        expect(gen.type).toBeDefined();
        expect(gen.framework).toBeDefined();
        expect(gen.language).toBeDefined();
        expect(gen.description).toBeDefined();
        expect(gen.requiredOptions).toBeDefined();
        expect(typeof gen.generate).toBe('function');
      });
    });
  });

  describe('getGeneratorsByType', () => {
    it('should return generators by type', () => {
      const apiGenerators = getGeneratorsByType('api');

      expect(apiGenerators.length).toBeGreaterThan(0);
      expect(apiGenerators.every((g) => g.type === 'api')).toBe(true);
    });

    it('should return auth generators', () => {
      const authGenerators = getGeneratorsByType('auth');

      expect(authGenerators.length).toBeGreaterThan(0);
      expect(authGenerators.every((g) => g.type === 'auth')).toBe(true);
    });

    it('should return empty array for non-existent type', () => {
      const generators = getGeneratorsByType('nonexistent' as any);

      expect(generators).toEqual([]);
    });
  });

  describe('getGeneratorsByFramework', () => {
    it('should return Express generators', () => {
      const expressGenerators = getGeneratorsByFramework('express');

      expect(expressGenerators.length).toBeGreaterThan(0);
      expect(expressGenerators.every((g) => g.framework === 'express')).toBe(true);
    });

    it('should return multiple generator types for framework', () => {
      const expressGenerators = getGeneratorsByFramework('express');

      const types = new Set(expressGenerators.map((g) => g.type));
      expect(types.size).toBeGreaterThan(1);
    });

    it('should return empty array for non-existent framework', () => {
      const generators = getGeneratorsByFramework('nonexistent' as any);

      expect(generators).toEqual([]);
    });
  });

  describe('Generator Properties', () => {
    it('should have proper required options for API generator', () => {
      const generator = findGenerator('api', 'express', 'typescript');

      expect(generator?.requiredOptions).toContain('name');
    });

    it('should have empty required options for auth generator', () => {
      const generator = findGenerator('auth', 'express', 'typescript');

      expect(generator?.requiredOptions).toHaveLength(0);
    });
  });
});
