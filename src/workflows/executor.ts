/**
 * Workflow executor - Run YAML-defined workflows
 */

import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import type { Workflow, WorkflowResult, WorkflowStep, StepResult } from '../types/workflow.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Load workflow from YAML file
 */
export async function loadWorkflow(filePath: string): Promise<Workflow> {
  const content = await fs.readFile(filePath, 'utf-8');
  const workflow = parseYaml(content) as Workflow;

  // Validate workflow
  if (!workflow.name || !workflow.steps || !Array.isArray(workflow.steps)) {
    throw new Error('Invalid workflow: must have name and steps array');
  }

  return workflow;
}

/**
 * Execute a single workflow step
 */
async function executeStep(step: WorkflowStep, variables: Record<string, string>): Promise<StepResult> {
  const startTime = Date.now();

  try {
    let output = '';

    switch (step.type) {
      case 'bash': {
        if (!step.command) throw new Error('bash step requires command');
        const cmd = replaceVariables(step.command, variables);
        const { stdout, stderr } = await execAsync(cmd, { timeout: 300000 });
        output = stdout + stderr;
        break;
      }

      case 'test': {
        const { runTests } = await import('../testing/runner.js');
        const result = await runTests(process.cwd());
        output = `Passed: ${result.passed}, Failed: ${result.failed}`;
        if (result.failed > 0) {
          throw new Error(`${result.failed} tests failed`);
        }
        break;
      }

      case 'index': {
        const { buildIndex, saveIndex } = await import('../indexing/index.js');
        const index = await buildIndex(process.cwd());
        await saveIndex(index);
        output = `Indexed ${index.totalFiles} files, ${index.totalSymbols} symbols`;
        break;
      }

      case 'git': {
        if (!step.command) throw new Error('git step requires command');
        const cmd = `git ${replaceVariables(step.command, variables)}`;
        const { stdout, stderr } = await execAsync(cmd);
        output = stdout + stderr;
        break;
      }

      case 'file': {
        if (!step.file) throw new Error('file step requires file path');
        const filePath = replaceVariables(step.file, variables);
        const content = await fs.readFile(filePath, 'utf-8');
        output = `Read ${content.length} bytes from ${filePath}`;
        break;
      }

      case 'ai': {
        output = step.prompt || 'AI step (would query LLM)';
        break;
      }

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    return {
      step: step.name,
      success: true,
      output: output.trim(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      step: step.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Replace variables in string
 */
function replaceVariables(str: string, variables: Record<string, string>): string {
  let result = str;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    result = result.replace(new RegExp(`\\$${key}\\b`, 'g'), value);
  }
  return result;
}

/**
 * Execute entire workflow
 */
export async function executeWorkflow(
  workflow: Workflow,
  onStepComplete?: (result: StepResult) => void
): Promise<WorkflowResult> {
  const startTime = Date.now();
  const results: StepResult[] = [];
  const variables = workflow.variables || {};

  for (const step of workflow.steps) {
    const result = await executeStep(step, variables);
    results.push(result);

    if (onStepComplete) {
      onStepComplete(result);
    }

    // Stop on error unless continueOnError is true
    if (!result.success && !step.continueOnError) {
      break;
    }
  }

  const allSuccess = results.every(r => r.success);

  return {
    workflow: workflow.name,
    success: allSuccess,
    steps: results,
    duration: Date.now() - startTime,
  };
}

/**
 * List available workflows in .ollama/workflows/
 */
export async function listWorkflows(projectRoot: string): Promise<string[]> {
  const workflowsDir = path.join(projectRoot, '.ollama', 'workflows');

  try {
    const files = await fs.readdir(workflowsDir);
    return files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    return [];
  }
}

/**
 * Get workflow path
 */
export function getWorkflowPath(projectRoot: string, name: string): string {
  const workflowsDir = path.join(projectRoot, '.ollama', 'workflows');

  // Add extension if not present
  if (!name.endsWith('.yml') && !name.endsWith('.yaml')) {
    name += '.yml';
  }

  return path.join(workflowsDir, name);
}
