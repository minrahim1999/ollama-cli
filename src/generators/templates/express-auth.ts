/**
 * Express Authentication Generator Template
 */

import type { GeneratorConfig, GeneratorResult, GeneratedFile } from '../../types/generators.js';

/**
 * Generate Express JWT Authentication
 */
export async function generateExpressAuth(config: GeneratorConfig): Promise<GeneratorResult> {
  const files: GeneratedFile[] = [];
  const { language, options } = config;
  const ext = language === 'typescript' ? 'ts' : 'js';
  const authType = options?.authType || 'jwt';

  if (authType === 'jwt') {
    // Generate auth middleware
    const middlewareContent = language === 'typescript'
      ? generateTypeScriptAuthMiddleware()
      : generateJavaScriptAuthMiddleware();

    files.push({
      path: `src/middleware/auth.${ext}`,
      content: middlewareContent,
      description: 'JWT authentication middleware',
    });

    // Generate auth controller
    const controllerContent = language === 'typescript'
      ? generateTypeScriptAuthController()
      : generateJavaScriptAuthController();

    files.push({
      path: `src/controllers/auth.${ext}`,
      content: controllerContent,
      description: 'Authentication controller with login/register',
    });

    // Generate auth routes
    const routesContent = language === 'typescript'
      ? generateTypeScriptAuthRoutes()
      : generateJavaScriptAuthRoutes();

    files.push({
      path: `src/routes/auth.${ext}`,
      content: routesContent,
      description: 'Authentication routes',
    });
  }

  const instructions = `
Generated JWT Authentication System:

1. Install dependencies:
   npm install jsonwebtoken bcrypt
   npm install --save-dev @types/jsonwebtoken @types/bcrypt

2. Create a .env file and add:
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=7d

3. Import auth routes in your main app:
   app.use('/api/auth', authRoutes);

4. Protect routes with auth middleware:
   router.get('/protected', auth, controllerFunction);

5. Implement user model and database integration.
`;

  return {
    success: true,
    files,
    instructions,
  };
}

function generateTypeScriptAuthMiddleware(): string {
  return `import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
`;
}

function generateJavaScriptAuthMiddleware(): string {
  return `const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
`;
}

function generateTypeScriptAuthController(): string {
  return `import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jwt';

/**
 * Register new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // TODO: Check if user exists in database

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Save user to database
    const user = {
      id: Math.random().toString(36),
      email,
      name,
      password: hashedPassword,
    };

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // TODO: Find user in database
    const user = null;

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get current user
 */
export async function me(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Fetch full user from database using req.user
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
`;
}

function generateJavaScriptAuthController(): string {
  return `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // TODO: Check if user exists

    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Save to database
    const user = { id: Math.random().toString(36), email, name };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // TODO: Find user in database
    const user = null;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ success: true, data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
`;
}

function generateTypeScriptAuthRoutes(): string {
  return `import express from 'express';
import { register, login, me } from '../controllers/auth.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', register);

// POST /api/auth/login - Login user
router.post('/login', login);

// GET /api/auth/me - Get current user (protected)
router.get('/me', auth, me);

export default router;
`;
}

function generateJavaScriptAuthRoutes(): string {
  return `const express = require('express');
const { register, login, me } = require('../controllers/auth');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, me);

module.exports = router;
`;
}
