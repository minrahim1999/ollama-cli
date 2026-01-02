/**
 * Generate Command Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { findGenerator, getAllGenerators } from '../generators/registry.js';
import { generateExpressAPI } from '../generators/templates/express-api.js';
import { generateExpressAuth } from '../generators/templates/express-auth.js';
import type { GeneratorConfig } from '../types/generators.js';
import fs from 'fs/promises';
import path from 'path';

describe('Generate Command', () => {
  const testOutputDir = path.join(process.cwd(), 'test-output');

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, ignore
    }
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('List Command', () => {
    it('should list all available generators', () => {
      const generators = getAllGenerators();

      expect(generators.length).toBeGreaterThan(0);
      expect(generators.every((g) => g.type && g.framework && g.language)).toBe(true);
    });

    it('should include generator descriptions', () => {
      const generators = getAllGenerators();

      generators.forEach((gen) => {
        expect(gen.description).toBeDefined();
        expect(gen.description.length).toBeGreaterThan(0);
      });
    });

    it('should include required options', () => {
      const generators = getAllGenerators();

      generators.forEach((gen) => {
        expect(Array.isArray(gen.requiredOptions)).toBe(true);
      });
    });
  });

  describe('API Command', () => {
    it('should generate Express TypeScript API', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET', 'POST'],
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2); // routes + controller
      expect(result.instructions).toBeDefined();
    });

    it('should generate Express JavaScript API', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'javascript',
        name: 'Product',
        options: {
          methods: ['GET'],
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.success).toBe(true);
      expect(result.files.every((f) => f.path.endsWith('.js'))).toBe(true);
    });

    it('should include validation when requested', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['POST'],
          validation: true,
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.files).toHaveLength(3); // routes + controller + validation
      const validationFile = result.files.find((f) => f.path.includes('validators'));
      expect(validationFile).toBeDefined();
    });

    it('should include auth middleware when requested', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET'],
          auth: true,
        },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('import { auth }');
    });

    it('should use default methods when none specified', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {},
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('router.get');
      expect(routeFile?.content).toContain('router.post');
      expect(routeFile?.content).toContain('router.put');
      expect(routeFile?.content).toContain('router.delete');
    });

    it('should handle resource names with special characters', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'user-profile',
        options: {
          methods: ['GET'],
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.success).toBe(true);
    });
  });

  describe('Auth Command', () => {
    it('should generate Express auth with JWT', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: {
          authType: 'jwt',
        },
      };

      const result = await generateExpressAuth(config);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(3); // middleware + controller + routes
    });

    it('should create auth middleware file', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: {
          authType: 'jwt',
        },
      };

      const result = await generateExpressAuth(config);
      const middlewareFile = result.files.find((f) => f.path.includes('middleware'));

      expect(middlewareFile).toBeDefined();
      expect(middlewareFile?.path).toBe('src/middleware/auth.ts');
      expect(middlewareFile?.content).toContain('jwt.verify');
    });

    it('should create auth controller with register/login', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: {
          authType: 'jwt',
        },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('export async function register');
      expect(controllerFile?.content).toContain('export async function login');
      expect(controllerFile?.content).toContain('bcrypt.hash');
    });

    it('should create protected routes', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: {
          authType: 'jwt',
        },
      };

      const result = await generateExpressAuth(config);
      const routesFile = result.files.find((f) => f.path.includes('routes'));

      expect(routesFile?.content).toContain("router.post('/register'");
      expect(routesFile?.content).toContain("router.post('/login'");
      expect(routesFile?.content).toContain("router.get('/me'");
      expect(routesFile?.content).toContain('auth, me');
    });

    it('should generate JavaScript auth files', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'javascript',
        name: 'auth',
        options: {
          authType: 'jwt',
        },
      };

      const result = await generateExpressAuth(config);

      expect(result.files.every((f) => f.path.endsWith('.js'))).toBe(true);
    });

    it('should use JWT as default auth type', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: {},
      };

      const result = await generateExpressAuth(config);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(3);
    });

    it('should provide installation instructions', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: {
          authType: 'jwt',
        },
      };

      const result = await generateExpressAuth(config);

      expect(result.instructions).toContain('npm install');
      expect(result.instructions).toContain('jsonwebtoken');
      expect(result.instructions).toContain('bcrypt');
      expect(result.instructions).toContain('.env');
      expect(result.instructions).toContain('JWT_SECRET');
    });
  });

  describe('Generator Registry', () => {
    it('should find generator by type and framework', () => {
      const generator = findGenerator('api', 'express', 'typescript');

      expect(generator).toBeDefined();
      expect(generator?.type).toBe('api');
      expect(generator?.framework).toBe('express');
    });

    it('should return null for non-existent generator', () => {
      const generator = findGenerator('api', 'django', 'python');

      expect(generator).toBeNull();
    });

    it('should find generators for different languages', () => {
      const tsGenerator = findGenerator('api', 'express', 'typescript');
      const jsGenerator = findGenerator('api', 'express', 'javascript');

      expect(tsGenerator).toBeDefined();
      expect(jsGenerator).toBeDefined();
      expect(tsGenerator?.language).toBe('typescript');
      expect(jsGenerator?.language).toBe('javascript');
    });
  });

  describe('File Generation', () => {
    it('should generate files with correct paths', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'Product',
        options: {
          methods: ['GET'],
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.files.some((f) => f.path === 'src/routes/product.ts')).toBe(true);
      expect(result.files.some((f) => f.path === 'src/controllers/product.ts')).toBe(true);
    });

    it('should generate files with descriptions', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET'],
        },
      };

      const result = await generateExpressAPI(config);

      result.files.forEach((file) => {
        expect(file.description).toBeDefined();
        expect(file.description.length).toBeGreaterThan(0);
      });
    });

    it('should generate valid TypeScript code', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET'],
        },
      };

      const result = await generateExpressAPI(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('import');
      expect(controllerFile?.content).toContain('export');
      expect(controllerFile?.content).toContain('interface');
      expect(controllerFile?.content).toContain('Request, Response');
    });

    it('should generate valid JavaScript code', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'javascript',
        name: 'User',
        options: {
          methods: ['GET'],
        },
      };

      const result = await generateExpressAPI(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(controllerFile?.content).toContain('exports.');
      expect(controllerFile?.content).not.toContain('interface');
      expect(routeFile?.content).toContain('require(');
      expect(routeFile?.content).toContain('module.exports');
    });
  });

  describe('Error Handling', () => {
    it('should validate required config fields', async () => {
      const invalidConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        // Missing 'name' field
        options: {},
      } as any;

      await expect(
        generateExpressAPI(invalidConfig)
      ).rejects.toThrow();
    });

    it('should handle invalid generator types gracefully', () => {
      const generator = findGenerator('invalid' as any, 'express', 'typescript');

      expect(generator).toBeNull();
    });

    it('should handle invalid frameworks gracefully', () => {
      const generator = findGenerator('api', 'invalid' as any, 'typescript');

      expect(generator).toBeNull();
    });
  });

  describe('Options Handling', () => {
    it('should respect methods option', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET', 'POST'],
        },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('router.get');
      expect(routeFile?.content).toContain('router.post');
    });

    it('should respect auth option', async () => {
      const configWithAuth: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET'],
          auth: true,
        },
      };

      const configWithoutAuth: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET'],
          auth: false,
        },
      };

      const resultWithAuth = await generateExpressAPI(configWithAuth);
      const resultWithoutAuth = await generateExpressAPI(configWithoutAuth);

      const routeWithAuth = resultWithAuth.files.find((f) => f.path.includes('routes'));
      const routeWithoutAuth = resultWithoutAuth.files.find((f) => f.path.includes('routes'));

      expect(routeWithAuth?.content).toContain('import { auth }');
      expect(routeWithoutAuth?.content).not.toContain('import { auth }');
    });

    it('should respect validation option', async () => {
      const configWithValidation: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['POST'],
          validation: true,
        },
      };

      const configWithoutValidation: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['POST'],
          validation: false,
        },
      };

      const resultWithValidation = await generateExpressAPI(configWithValidation);
      const resultWithoutValidation = await generateExpressAPI(configWithoutValidation);

      expect(resultWithValidation.files).toHaveLength(3); // routes + controller + validation
      expect(resultWithoutValidation.files).toHaveLength(2); // routes + controller only
    });
  });
});
