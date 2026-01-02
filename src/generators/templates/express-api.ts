/**
 * Express REST API Generator Template
 */

import type { GeneratorConfig, GeneratorResult, GeneratedFile } from '../../types/generators.js';

/**
 * Generate Express REST API endpoint
 */
export async function generateExpressAPI(config: GeneratorConfig): Promise<GeneratorResult> {
  const files: GeneratedFile[] = [];
  const { name, options, language } = config;
  const resourceName = name.toLowerCase();
  const ResourceName = capitalize(name);
  const ext = language === 'typescript' ? 'ts' : 'js';
  const methods = options?.methods || ['GET', 'POST', 'PUT', 'DELETE'];
  const useAuth = options?.auth || false;
  const useValidation = options?.validation || false;

  // Generate route file
  const routeContent = language === 'typescript'
    ? generateTypeScriptRoute(resourceName, ResourceName, methods, useAuth, useValidation)
    : generateJavaScriptRoute(resourceName, ResourceName, methods, useAuth, useValidation);

  files.push({
    path: `src/routes/${resourceName}.${ext}`,
    content: routeContent,
    description: `REST API routes for ${ResourceName}`,
  });

  // Generate controller file
  const controllerContent = language === 'typescript'
    ? generateTypeScriptController(resourceName, ResourceName, methods)
    : generateJavaScriptController(resourceName, ResourceName, methods);

  files.push({
    path: `src/controllers/${resourceName}.${ext}`,
    content: controllerContent,
    description: `Controller with business logic for ${ResourceName}`,
  });

  // Generate validation schema if requested
  if (useValidation && (language === 'typescript' || language === 'javascript')) {
    const validationContent = generateValidationSchema(resourceName, ResourceName, language);
    files.push({
      path: `src/validators/${resourceName}.${ext}`,
      content: validationContent,
      description: `Validation schemas for ${ResourceName}`,
    });
  }

  const instructions = `
Generated Express REST API for ${ResourceName}:

1. Install dependencies:
   npm install express${language === 'typescript' ? ' @types/express' : ''}${useValidation ? ' joi' : ''}${useAuth ? ' jsonwebtoken' : ''}

2. Import the routes in your main app:
   ${language === 'typescript' ? "import" : "const"} ${resourceName}Routes ${language === 'typescript' ? "from" : "= require"}('./routes/${resourceName}${language === 'typescript' ? '.js' : ''}');
   app.use('/api/${resourceName}s', ${resourceName}Routes);

3. Implement the actual database logic in the controller.

${useAuth ? '4. Set up JWT authentication middleware.' : ''}
`;

  return {
    success: true,
    files,
    instructions,
  };
}

function generateTypeScriptRoute(
  resourceName: string,
  ResourceName: string,
  methods: string[],
  useAuth: boolean,
  useValidation: boolean
): string {
  const authMiddleware = useAuth ? 'auth, ' : '';
  const validationImport = useValidation ? `import { validate${ResourceName} } from '../validators/${resourceName}.js';` : '';
  const validationMiddleware = useValidation ? `validate${ResourceName}, ` : '';

  return `import express from 'express';
import {
  ${methods.includes('GET') ? `getAll${ResourceName}s,\n  get${ResourceName}ById,` : ''}
  ${methods.includes('POST') ? `create${ResourceName},` : ''}
  ${methods.includes('PUT') || methods.includes('PATCH') ? `update${ResourceName},` : ''}
  ${methods.includes('DELETE') ? `delete${ResourceName},` : ''}
} from '../controllers/${resourceName}.js';
${useAuth ? "import { auth } from '../middleware/auth.js';" : ''}
${validationImport}

const router = express.Router();

${methods.includes('GET') ? `// GET /api/${resourceName}s - Get all ${resourceName}s
router.get('/', ${authMiddleware}getAll${ResourceName}s);

// GET /api/${resourceName}s/:id - Get ${resourceName} by ID
router.get('/:id', ${authMiddleware}get${ResourceName}ById);
` : ''}
${methods.includes('POST') ? `// POST /api/${resourceName}s - Create new ${resourceName}
router.post('/', ${authMiddleware}${validationMiddleware}create${ResourceName});
` : ''}
${methods.includes('PUT') ? `// PUT /api/${resourceName}s/:id - Update ${resourceName}
router.put('/:id', ${authMiddleware}${validationMiddleware}update${ResourceName});
` : ''}
${methods.includes('DELETE') ? `// DELETE /api/${resourceName}s/:id - Delete ${resourceName}
router.delete('/:id', ${authMiddleware}delete${ResourceName});
` : ''}
export default router;
`;
}

function generateJavaScriptRoute(
  resourceName: string,
  ResourceName: string,
  methods: string[],
  useAuth: boolean,
  useValidation: boolean
): string {
  const authMiddleware = useAuth ? 'auth, ' : '';
  const validationMiddleware = useValidation ? `validate${ResourceName}, ` : '';

  return `const express = require('express');
const {
  ${methods.includes('GET') ? `getAll${ResourceName}s,\n  get${ResourceName}ById,` : ''}
  ${methods.includes('POST') ? `create${ResourceName},` : ''}
  ${methods.includes('PUT') || methods.includes('PATCH') ? `update${ResourceName},` : ''}
  ${methods.includes('DELETE') ? `delete${ResourceName},` : ''}
} = require('../controllers/${resourceName}');
${useAuth ? "const { auth } = require('../middleware/auth');" : ''}
${useValidation ? `const { validate${ResourceName} } = require('../validators/${resourceName}');` : ''}

const router = express.Router();

${methods.includes('GET') ? `router.get('/', ${authMiddleware}getAll${ResourceName}s);
router.get('/:id', ${authMiddleware}get${ResourceName}ById);
` : ''}
${methods.includes('POST') ? `router.post('/', ${authMiddleware}${validationMiddleware}create${ResourceName});
` : ''}
${methods.includes('PUT') ? `router.put('/:id', ${authMiddleware}${validationMiddleware}update${ResourceName});
` : ''}
${methods.includes('DELETE') ? `router.delete('/:id', ${authMiddleware}delete${ResourceName});
` : ''}
module.exports = router;
`;
}

function generateTypeScriptController(
  resourceName: string,
  ResourceName: string,
  methods: string[]
): string {
  return `import type { Request, Response } from 'express';

// TODO: Replace with actual database model
interface ${ResourceName} {
  id: string;
  // Add your fields here
  createdAt: Date;
  updatedAt: Date;
}

${methods.includes('GET') ? `/**
 * Get all ${resourceName}s
 */
export async function getAll${ResourceName}s(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Fetch from database
    const ${resourceName}s: ${ResourceName}[] = [];
    res.json({ success: true, data: ${resourceName}s });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get ${resourceName} by ID
 */
export async function get${ResourceName}ById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    // TODO: Fetch from database
    const ${resourceName}: ${ResourceName} | null = null;

    if (!${resourceName}) {
      res.status(404).json({ success: false, error: '${ResourceName} not found' });
      return;
    }

    res.json({ success: true, data: ${resourceName} });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
` : ''}
${methods.includes('POST') ? `/**
 * Create new ${resourceName}
 */
export async function create${ResourceName}(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    // TODO: Save to database
    const new${ResourceName}: ${ResourceName} = {
      id: Math.random().toString(36),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.status(201).json({ success: true, data: new${ResourceName} });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
` : ''}
${methods.includes('PUT') ? `/**
 * Update ${resourceName}
 */
export async function update${ResourceName}(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = req.body;
    // TODO: Update in database
    const updated${ResourceName}: ${ResourceName} | null = null;

    if (!updated${ResourceName}) {
      res.status(404).json({ success: false, error: '${ResourceName} not found' });
      return;
    }

    res.json({ success: true, data: updated${ResourceName} });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
` : ''}
${methods.includes('DELETE') ? `/**
 * Delete ${resourceName}
 */
export async function delete${ResourceName}(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    // TODO: Delete from database
    const deleted = true;

    if (!deleted) {
      res.status(404).json({ success: false, error: '${ResourceName} not found' });
      return;
    }

    res.json({ success: true, message: '${ResourceName} deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
` : ''}`;
}

function generateJavaScriptController(
  resourceName: string,
  ResourceName: string,
  methods: string[]
): string {
  return `${methods.includes('GET') ? `exports.getAll${ResourceName}s = async (req, res) => {
  try {
    // TODO: Fetch from database
    const ${resourceName}s = [];
    res.json({ success: true, data: ${resourceName}s });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.get${ResourceName}ById = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Fetch from database
    const ${resourceName} = null;

    if (!${resourceName}) {
      return res.status(404).json({ success: false, error: '${ResourceName} not found' });
    }

    res.json({ success: true, data: ${resourceName} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
` : ''}
${methods.includes('POST') ? `exports.create${ResourceName} = async (req, res) => {
  try {
    const data = req.body;
    // TODO: Save to database
    const new${ResourceName} = { id: Math.random().toString(36), ...data };
    res.status(201).json({ success: true, data: new${ResourceName} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
` : ''}
${methods.includes('PUT') ? `exports.update${ResourceName} = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    // TODO: Update in database
    const updated${ResourceName} = null;

    if (!updated${ResourceName}) {
      return res.status(404).json({ success: false, error: '${ResourceName} not found' });
    }

    res.json({ success: true, data: updated${ResourceName} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
` : ''}
${methods.includes('DELETE') ? `exports.delete${ResourceName} = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Delete from database
    res.json({ success: true, message: '${ResourceName} deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
` : ''}`;
}

function generateValidationSchema(
  resourceName: string,
  ResourceName: string,
  language: 'typescript' | 'javascript'
): string {
  if (language === 'typescript') {
    return `import Joi from 'joi';
import type { Request, Response, NextFunction } from 'express';

const ${resourceName}Schema = Joi.object({
  // TODO: Add your validation rules
  name: Joi.string().required().min(3).max(255),
  email: Joi.string().email().optional(),
  age: Joi.number().integer().min(0).optional(),
});

export function validate${ResourceName}(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { error } = ${resourceName}Schema.validate(req.body);

  if (error) {
    res.status(400).json({
      success: false,
      error: error.details[0]?.message || 'Validation error',
    });
    return;
  }

  next();
}
`;
  } else {
    return `const Joi = require('joi');

const ${resourceName}Schema = Joi.object({
  // TODO: Add your validation rules
  name: Joi.string().required().min(3).max(255),
  email: Joi.string().email().optional(),
  age: Joi.number().integer().min(0).optional(),
});

exports.validate${ResourceName} = (req, res, next) => {
  const { error } = ${resourceName}Schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0]?.message || 'Validation error',
    });
  }

  next();
};
`;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
