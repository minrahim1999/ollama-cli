/**
 * Workflow command - Manage and execute workflows
 */

import { loadWorkflow, executeWorkflow, listWorkflows, getWorkflowPath } from '../workflows/executor.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { startSpinner, stopSpinner } from '../ui/spinner.js';

export type WorkflowCommand = 'run' | 'list' | 'show';

/**
 * Main workflow command handler
 */
export async function workflowCommand(command: WorkflowCommand, args: string[]): Promise<void> {
  const projectRoot = process.cwd();

  switch (command) {
    case 'run':
      if (args.length === 0) {
        displayError('Usage: ollama-cli workflow run <workflow-name>');
        return;
      }
      await runWorkflowCmd(projectRoot, args[0]!);
      break;

    case 'list':
      await listWorkflowsCmd(projectRoot);
      break;

    case 'show':
      if (args.length === 0) {
        displayError('Usage: ollama-cli workflow show <workflow-name>');
        return;
      }
      await showWorkflowCmd(projectRoot, args[0]!);
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: run, list, show');
  }
}

/**
 * Run a workflow
 */
async function runWorkflowCmd(projectRoot: string, name: string): Promise<void> {
  try {
    const workflowPath = getWorkflowPath(projectRoot, name);
    const workflow = await loadWorkflow(workflowPath);

    console.log('');
    console.log(gradients.brand(`Running Workflow: ${workflow.name}`));
    if (workflow.description) {
      console.log(colors.tertiary(workflow.description));
    }
    console.log('');

    startSpinner('Executing workflow...');

    const result = await executeWorkflow(workflow, (stepResult) => {
      stopSpinner();

      const icon = stepResult.success ? '✅' : '❌';
      console.log(`${icon} ${colors.secondary(stepResult.step)} ${colors.dim(`(${stepResult.duration}ms)`)}`);

      if (stepResult.output) {
        const preview = stepResult.output.substring(0, 100);
        console.log(`   ${colors.tertiary(preview)}${stepResult.output.length > 100 ? '...' : ''}`);
      }

      if (stepResult.error) {
        console.log(`   ${colors.error(stepResult.error)}`);
      }

      console.log('');
      startSpinner('Continuing...');
    });

    stopSpinner();

    console.log('');
    if (result.success) {
      displaySuccess(`Workflow completed in ${result.duration}ms`);
    } else {
      displayError('Workflow failed');
    }
    console.log('');
  } catch (error) {
    stopSpinner();
    displayError(error instanceof Error ? error.message : 'Failed to run workflow');
  }
}

/**
 * List available workflows
 */
async function listWorkflowsCmd(projectRoot: string): Promise<void> {
  try {
    const workflows = await listWorkflows(projectRoot);

    if (workflows.length === 0) {
      displayInfo('No workflows found in .ollama/workflows/');
      console.log('');
      console.log(colors.tertiary('Create a workflow file (.ollama/workflows/deploy.yml):'));
      console.log(colors.dim(exampleWorkflow));
      return;
    }

    console.log('');
    console.log(gradients.brand('Available Workflows'));
    console.log('');

    for (const workflow of workflows) {
      console.log(`  ${colors.brand.primary('•')} ${colors.secondary(workflow)}`);
    }

    console.log('');
    console.log(colors.tertiary(`Run with: ollama-cli workflow run <name>`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to list workflows');
  }
}

/**
 * Show workflow details
 */
async function showWorkflowCmd(projectRoot: string, name: string): Promise<void> {
  try {
    const workflowPath = getWorkflowPath(projectRoot, name);
    const workflow = await loadWorkflow(workflowPath);

    console.log('');
    console.log(gradients.brand(workflow.name));
    if (workflow.description) {
      console.log(colors.tertiary(workflow.description));
    }
    console.log('');

    console.log(colors.secondary('Steps:'));
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]!;
      console.log(`  ${i + 1}. ${colors.brand.primary(step.name)} (${step.type})`);
      if (step.command) {
        console.log(`     ${colors.dim(`Command: ${step.command}`)}`);
      }
    }

    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to show workflow');
  }
}

const exampleWorkflow = `
name: Deploy Workflow
description: Build, test, and deploy application
steps:
  - name: Install dependencies
    type: bash
    command: npm install

  - name: Run tests
    type: test

  - name: Build project
    type: bash
    command: npm run build

  - name: Deploy
    type: bash
    command: npm run deploy
`;
