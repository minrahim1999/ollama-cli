/**
 * Project context management
 * Handles .ollama directory and PROJECT.md file
 */

import fs from 'fs/promises';
import path from 'path';
import type { ProjectContext, ProjectConfig, ProjectPermissions, ProjectMetadata } from '../types/project.js';

const OLLAMA_DIR = '.ollama';
const PROJECT_MD = 'PROJECT.md';
const CONFIG_FILE = 'config.json';

/**
 * Get .ollama directory path for a project
 */
export function getOllamaDirPath(projectPath: string): string {
  return path.join(projectPath, OLLAMA_DIR);
}

/**
 * Get PROJECT.md file path
 */
export function getProjectMdPath(projectPath: string): string {
  return path.join(projectPath, PROJECT_MD);
}

/**
 * Get project config file path
 */
function getProjectConfigPath(projectPath: string): string {
  return path.join(getOllamaDirPath(projectPath), CONFIG_FILE);
}

/**
 * Check if directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Detect project context
 */
export async function detectProjectContext(projectPath: string): Promise<ProjectContext> {
  const hasOllamaDir = await directoryExists(getOllamaDirPath(projectPath));
  const hasProjectMd = await fileExists(getProjectMdPath(projectPath));

  const projectName = path.basename(projectPath);

  // Load config if .ollama exists
  let permissions: ProjectPermissions = {
    canReadFiles: false,
    canWriteFiles: false,
    canExecuteCommands: false,
  };

  let metadata: ProjectMetadata | undefined;

  if (hasOllamaDir) {
    const config = await loadProjectConfig(projectPath);
    if (config) {
      permissions = config.permissions;
      metadata = config.metadata;
    }
  }

  return {
    projectPath,
    projectName,
    hasOllamaDir,
    hasProjectMd,
    permissions,
    metadata,
  };
}

/**
 * Initialize project
 */
export async function initializeProject(
  projectPath: string,
  options: {
    permissions: ProjectPermissions;
    metadata?: ProjectMetadata | undefined;
  }
): Promise<void> {
  const ollamaDir = getOllamaDirPath(projectPath);

  // Create .ollama directory
  await fs.mkdir(ollamaDir, { recursive: true });

  // Create sessions subdirectory
  await fs.mkdir(path.join(ollamaDir, 'sessions'), { recursive: true });

  // Create config.json
  const config: ProjectConfig = {
    version: '1.0.0',
    projectName: path.basename(projectPath),
    permissions: options.permissions,
    metadata: options.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveProjectConfig(projectPath, config);

  // Create PROJECT.md
  await createProjectMd(projectPath, config);
}

/**
 * Load project config
 */
export async function loadProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
  try {
    const configPath = getProjectConfigPath(projectPath);
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as ProjectConfig;
  } catch {
    return null;
  }
}

/**
 * Save project config
 */
export async function saveProjectConfig(projectPath: string, config: ProjectConfig): Promise<void> {
  const configPath = getProjectConfigPath(projectPath);
  config.updatedAt = new Date().toISOString();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Update project permissions
 */
export async function updateProjectPermissions(
  projectPath: string,
  permissions: Partial<ProjectPermissions>
): Promise<void> {
  const config = await loadProjectConfig(projectPath);
  if (!config) {
    throw new Error('Project not initialized');
  }

  config.permissions = {
    ...config.permissions,
    ...permissions,
    grantedAt: new Date().toISOString(),
  };

  await saveProjectConfig(projectPath, config);
}

/**
 * Read PROJECT.md content
 */
export async function readProjectMd(projectPath: string): Promise<string | null> {
  try {
    const mdPath = getProjectMdPath(projectPath);
    return await fs.readFile(mdPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Create PROJECT.md file
 */
async function createProjectMd(projectPath: string, config: ProjectConfig): Promise<void> {
  const mdPath = getProjectMdPath(projectPath);

  // Auto-detect project information
  const packageJsonPath = path.join(projectPath, 'package.json');
  let packageInfo: { name?: string; description?: string; version?: string } = {};

  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    packageInfo = JSON.parse(packageContent);
  } catch {
    // No package.json
  }

  const template = generateProjectMdTemplate(config, packageInfo);
  await fs.writeFile(mdPath, template, 'utf-8');
}

/**
 * Generate PROJECT.md template
 */
function generateProjectMdTemplate(
  config: ProjectConfig,
  packageInfo: { name?: string; description?: string; version?: string }
): string {
  const projectName = packageInfo.name || config.projectName;
  const description = packageInfo.description || 'Add your project description here';
  const version = packageInfo.version || '1.0.0';

  return `# ${projectName}

<!--
  PROJECT.md - Project Context for Ollama CLI

  This file helps the AI assistant understand your project better.
  Update the sections below with relevant information about your project.
  The AI will use this context to provide more accurate and helpful responses.
-->

## Overview

**Version:** ${version}
**Description:** ${description}

## Project Structure

\`\`\`
${projectName}/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
└── ...
\`\`\`

## Tech Stack

**Languages:** ${config.metadata.language || 'JavaScript, TypeScript'}
**Framework:** ${config.metadata.framework || 'Node.js'}
**Package Manager:** ${config.metadata.packageManager || 'npm'}

## Architecture

<!-- Describe your project architecture, design patterns, and key components -->

Add your architecture description here.

## Key Files and Directories

- \`src/\` - Main application code
- \`tests/\` - Unit and integration tests
- \`README.md\` - User-facing documentation

## Development Guidelines

<!-- Add coding standards, conventions, and best practices -->

### Code Style
- Follow ESLint rules
- Use TypeScript for type safety
- Write tests for new features

### Git Workflow
- Feature branches from \`main\`
- Pull requests require review
- Squash commits before merging

## Common Tasks

<!-- Add frequently performed tasks and commands -->

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
\`\`\`

## Important Context

<!-- Add any project-specific context the AI should know -->

### Dependencies
- List key dependencies and their purposes

### Patterns Used
- Describe common patterns in your codebase

### Known Issues
- Document any known issues or technical debt

## Custom Instructions for AI

<!-- Specific instructions for how the AI should help with this project -->

${config.metadata.customInstructions || `When working on this project:
1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation when making changes
4. Consider backwards compatibility`}

## Tags

<!-- Tags help the AI understand project characteristics -->

${(config.metadata.tags || ['development', 'nodejs']).map((tag) => `#${tag}`).join(' ')}

---

Last updated: ${new Date().toLocaleDateString()}
`;
}

/**
 * Check if project is initialized
 */
export async function isProjectInitialized(projectPath: string): Promise<boolean> {
  return await directoryExists(getOllamaDirPath(projectPath));
}
