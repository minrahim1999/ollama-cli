/**
 * Express Auth Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateExpressAuth } from './express-auth.js';
import type { GeneratorConfig } from '../../types/generators.js';

describe('Express Auth Generator', () => {
  describe('JWT Authentication Generation', () => {
    it('should generate JWT auth files', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(3); // middleware + controller + routes
      expect(result.instructions).toBeDefined();
    });

    it('should create auth middleware file', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const middlewareFile = result.files.find((f) => f.path.includes('middleware'));

      expect(middlewareFile).toBeDefined();
      expect(middlewareFile?.path).toBe('src/middleware/auth.ts');
      expect(middlewareFile?.description).toContain('JWT authentication');
    });

    it('should create auth controller file', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile).toBeDefined();
      expect(controllerFile?.path).toBe('src/controllers/auth.ts');
      expect(controllerFile?.description).toContain('login/register');
    });

    it('should create auth routes file', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const routesFile = result.files.find((f) => f.path.includes('routes'));

      expect(routesFile).toBeDefined();
      expect(routesFile?.path).toBe('src/routes/auth.ts');
    });
  });

  describe('TypeScript Middleware', () => {
    it('should include JWT verification', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const middlewareFile = result.files.find((f) => f.path.includes('middleware'));

      expect(middlewareFile?.content).toContain('jwt.verify');
      expect(middlewareFile?.content).toContain('Bearer');
      expect(middlewareFile?.content).toContain('Authorization');
    });

    it('should include TypeScript types', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const middlewareFile = result.files.find((f) => f.path.includes('middleware'));

      expect(middlewareFile?.content).toContain('interface JWTPayload');
      expect(middlewareFile?.content).toContain('Request, Response, NextFunction');
    });

    it('should extend Express Request type', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const middlewareFile = result.files.find((f) => f.path.includes('middleware'));

      expect(middlewareFile?.content).toContain('declare global');
      expect(middlewareFile?.content).toContain('namespace Express');
      expect(middlewareFile?.content).toContain('req.user');
    });
  });

  describe('JavaScript Middleware', () => {
    it('should generate JavaScript middleware', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'javascript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const middlewareFile = result.files.find((f) => f.path.includes('middleware'));

      expect(middlewareFile?.path).toBe('src/middleware/auth.js');
      expect(middlewareFile?.content).toContain('require(');
      expect(middlewareFile?.content).toContain('exports.auth');
    });
  });

  describe('Controller Functions', () => {
    it('should include register function', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('export async function register');
      expect(controllerFile?.content).toContain('bcrypt.hash');
      expect(controllerFile?.content).toContain('jwt.sign');
    });

    it('should include login function', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('export async function login');
      expect(controllerFile?.content).toContain('bcrypt.compare');
    });

    it('should include me function', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('export async function me');
      expect(controllerFile?.content).toContain('req.user');
    });

    it('should include password hashing', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('bcrypt');
      expect(controllerFile?.content).toContain('hash(password, 10)');
    });

    it('should include error handling', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('try {');
      expect(controllerFile?.content).toContain('catch (error)');
      expect(controllerFile?.content).toContain('res.status(401)');
      expect(controllerFile?.content).toContain('Invalid credentials');
    });
  });

  describe('Routes', () => {
    it('should include register route', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const routesFile = result.files.find((f) => f.path.includes('routes'));

      expect(routesFile?.content).toContain("router.post('/register'");
    });

    it('should include login route', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const routesFile = result.files.find((f) => f.path.includes('routes'));

      expect(routesFile?.content).toContain("router.post('/login'");
    });

    it('should include protected me route', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const routesFile = result.files.find((f) => f.path.includes('routes'));

      expect(routesFile?.content).toContain("router.get('/me'");
      expect(routesFile?.content).toContain('auth, me');
    });

    it('should import auth middleware', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const routesFile = result.files.find((f) => f.path.includes('routes'));

      expect(routesFile?.content).toContain("import { auth }");
    });
  });

  describe('Instructions', () => {
    it('should provide dependency installation instructions', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);

      expect(result.instructions).toContain('npm install');
      expect(result.instructions).toContain('jsonwebtoken');
      expect(result.instructions).toContain('bcrypt');
    });

    it('should mention environment variables', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);

      expect(result.instructions).toContain('.env');
      expect(result.instructions).toContain('JWT_SECRET');
      expect(result.instructions).toContain('JWT_EXPIRES_IN');
    });

    it('should provide usage examples', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);

      expect(result.instructions).toContain('app.use');
      expect(result.instructions).toContain('/api/auth');
      expect(result.instructions).toContain('Protect routes');
    });

    it('should mention database integration', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'typescript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);

      expect(result.instructions).toContain('user model');
      expect(result.instructions).toContain('database');
    });
  });

  describe('Default Options', () => {
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
  });

  describe('JavaScript Generation', () => {
    it('should generate JavaScript files', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'javascript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);

      expect(result.files.every((f) => f.path.endsWith('.js'))).toBe(true);
    });

    it('should use exports.functionName pattern', async () => {
      const config: GeneratorConfig = {
        type: 'auth',
        framework: 'express',
        language: 'javascript',
        name: 'auth',
        options: { authType: 'jwt' },
      };

      const result = await generateExpressAuth(config);
      const controllerFile = result.files.find((f) => f.path.includes('controllers'));

      expect(controllerFile?.content).toContain('exports.register');
      expect(controllerFile?.content).toContain('exports.login');
      expect(controllerFile?.content).toContain('exports.me');
    });
  });
});
