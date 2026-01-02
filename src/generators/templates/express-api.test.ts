/**
 * Express API Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateExpressAPI } from './express-api.js';
import type { GeneratorConfig } from '../../types/generators.js';

describe('Express API Generator', () => {
  describe('TypeScript Generation', () => {
    it('should generate TypeScript API files', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          auth: false,
          validation: false,
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2); // routes + controller
      expect(result.instructions).toBeDefined();
    });

    it('should create route file with correct path', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'Product',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.path).toBe('src/routes/product.ts');
    });

    it('should create controller file with correct path', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'Product',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.path).toBe('src/controllers/product.ts');
    });

    it('should include GET methods when requested', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('getAllUsers');
      expect(routeFile?.content).toContain('getUserById');
      expect(routeFile?.content).toContain('router.get');
    });

    it('should include POST method when requested', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['POST'] },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('createUser');
      expect(routeFile?.content).toContain('router.post');
    });

    it('should include PUT method when requested', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['PUT'] },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('updateUser');
      expect(routeFile?.content).toContain('router.put');
    });

    it('should include DELETE method when requested', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['DELETE'] },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('deleteUser');
      expect(routeFile?.content).toContain('router.delete');
    });
  });

  describe('JavaScript Generation', () => {
    it('should generate JavaScript API files', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'javascript',
        name: 'User',
        options: {
          methods: ['GET', 'POST'],
          auth: false,
          validation: false,
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
    });

    it('should use .js extension for JavaScript', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'javascript',
        name: 'Product',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);

      expect(result.files[0]?.path).toContain('.js');
      expect(result.files[1]?.path).toContain('.js');
    });

    it('should use require instead of import', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'javascript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('require(');
      expect(routeFile?.content).toContain('module.exports');
      expect(routeFile?.content).not.toContain('import ');
    });
  });

  describe('Authentication', () => {
    it('should add auth middleware when enabled', async () => {
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
      expect(routeFile?.content).toContain('auth,');
    });

    it('should not include auth when disabled', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['GET'],
          auth: false,
        },
      };

      const result = await generateExpressAPI(config);
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).not.toContain('import { auth }');
    });
  });

  describe('Validation', () => {
    it('should generate validation file when enabled', async () => {
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
      expect(validationFile?.path).toBe('src/validators/user.ts');
    });

    it('should include Joi validation schema', async () => {
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
      const validationFile = result.files.find((f) => f.path.includes('validators'));

      expect(validationFile?.content).toContain('import Joi');
      expect(validationFile?.content).toContain('validateUser');
      expect(validationFile?.content).toContain('Joi.object');
    });

    it('should add validation middleware to routes', async () => {
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
      const routeFile = result.files.find((f) => f.path.includes('routes'));

      expect(routeFile?.content).toContain('validateUser');
      expect(routeFile?.content).toContain('import { validateUser }');
    });

    it('should not generate validation file when disabled', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: {
          methods: ['POST'],
          validation: false,
        },
      };

      const result = await generateExpressAPI(config);

      expect(result.files).toHaveLength(2); // Only routes + controller
    });
  });

  describe('Controller Content', () => {
    it('should generate TypeScript interfaces', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('interface User');
      expect(controllerFile?.content).toContain('Request, Response');
    });

    it('should include error handling', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('try {');
      expect(controllerFile?.content).toContain('catch (error)');
      expect(controllerFile?.content).toContain('res.status(500)');
    });

    it('should include TODO comments for database integration', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('// TODO:');
    });
  });

  describe('Instructions', () => {
    it('should provide installation instructions', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);

      expect(result.instructions).toContain('npm install');
      expect(result.instructions).toContain('express');
    });

    it('should include import instructions', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'User',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);

      expect(result.instructions).toContain('import');
      expect(result.instructions).toContain('app.use');
    });

    it('should mention validation dependencies when enabled', async () => {
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

      expect(result.instructions).toContain('joi');
    });

    it('should mention auth dependencies when enabled', async () => {
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

      expect(result.instructions).toContain('JWT');
    });
  });

  describe('Edge Cases', () => {
    it('should handle resource names with special characters', async () => {
      const config: GeneratorConfig = {
        type: 'api',
        framework: 'express',
        language: 'typescript',
        name: 'user-profile',
        options: { methods: ['GET'] },
      };

      const result = await generateExpressAPI(config);
      expect(result.success).toBe(true);
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
  });
});
