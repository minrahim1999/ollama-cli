/**
 * Project context types
 * Handles project-specific configuration and context
 */

export interface ProjectContext {
  projectPath: string;
  projectName: string;
  description?: string | undefined;
  version?: string | undefined;
  hasProjectMd: boolean;
  hasOllamaDir: boolean;
  permissions: ProjectPermissions;
  metadata?: ProjectMetadata | undefined;
}

export interface ProjectPermissions {
  canReadFiles: boolean;
  canWriteFiles: boolean;
  canExecuteCommands: boolean;
  grantedAt?: string | undefined;
}

export interface ProjectMetadata {
  framework?: string | undefined;
  language?: string | undefined;
  packageManager?: string | undefined;
  tags?: string[] | undefined;
  customInstructions?: string | undefined;
}

export interface ProjectConfig {
  version: string;
  projectName: string;
  permissions: ProjectPermissions;
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}
