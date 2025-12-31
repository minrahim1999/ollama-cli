/**
 * Plan executor - Execute plans step by step
 */

import type { ChatSession } from '../types/index.js';
import type { PlanStep } from '../types/plan.js';
import { OllamaClient } from '../api/client.js';
import { ToolExecutor } from '../tools/executor.js';
import {
  loadPlan,
  updateStepStatus,
  updatePlanStatus,
  getNextStep,
  isPlanComplete,
} from './index.js';
import { addMessage } from '../session/index.js';

export interface ExecutionOptions {
  client: OllamaClient;
  session: ChatSession;
  toolExecutor: ToolExecutor;
  onStepStart?: ((step: PlanStep) => void | Promise<void>) | undefined;
  onStepComplete?: ((step: PlanStep) => void | Promise<void>) | undefined;
  onStepError?: ((step: PlanStep, error: Error) => void | Promise<void>) | undefined;
  onPlanComplete?: (() => void | Promise<void>) | undefined;
}

/**
 * Execute a plan step by step
 */
export async function executePlan(
  planId: string,
  options: ExecutionOptions
): Promise<boolean> {
  let plan = await loadPlan(planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  // Update plan status to in-progress
  await updatePlanStatus(planId, 'in-progress');

  try {
    while (!isPlanComplete(plan)) {
      const step = getNextStep(plan);
      if (!step) {
        break;
      }

      // Execute step
      await executeStep(planId, step, options);

      // Reload plan to get updated state
      const updatedPlan = await loadPlan(planId);
      if (!updatedPlan) {
        throw new Error('Plan was deleted during execution');
      }
      plan = updatedPlan;
    }

    // Mark plan as completed
    await updatePlanStatus(planId, 'completed');

    if (options.onPlanComplete) {
      await options.onPlanComplete();
    }

    return true;
  } catch (error) {
    // Mark plan as failed but keep it for review
    await updatePlanStatus(planId, 'cancelled');
    throw error;
  }
}

/**
 * Execute a single step
 */
async function executeStep(
  planId: string,
  step: PlanStep,
  options: ExecutionOptions
): Promise<void> {
  const { client, session, toolExecutor, onStepStart, onStepComplete, onStepError } = options;

  // Mark step as in-progress
  await updateStepStatus(planId, step.id, 'in-progress');

  if (onStepStart) {
    await onStepStart(step);
  }

  try {
    let result: string;

    switch (step.type) {
      case 'explore':
        result = await executeExploreStep(step, client, session);
        break;

      case 'create':
      case 'modify':
      case 'delete':
        result = await executeFileStep(step, client, session, toolExecutor);
        break;

      case 'execute':
        result = await executeCommandStep(step, client, session, toolExecutor);
        break;

      case 'test':
        result = await executeTestStep(step, client, session, toolExecutor);
        break;

      default:
        result = `Step type ${step.type} not implemented`;
    }

    // Mark step as completed
    await updateStepStatus(planId, step.id, 'completed', result);

    if (onStepComplete) {
      await onStepComplete(step);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateStepStatus(planId, step.id, 'failed', undefined, errorMessage);

    if (onStepError) {
      await onStepError(step, error instanceof Error ? error : new Error(errorMessage));
    }

    throw error;
  }
}

/**
 * Execute exploration step
 */
async function executeExploreStep(
  step: PlanStep,
  client: OllamaClient,
  session: ChatSession
): Promise<string> {
  // Add exploration message to session
  await addMessage(session, {
    role: 'user',
    content: `Explore: ${step.description}\nFiles to analyze: ${step.files.join(', ')}`,
  });

  let fullResponse = '';

  for await (const chunk of client.chat({
    model: session.model,
    messages: [
      ...session.messages,
      {
        role: 'system',
        content:
          'You are exploring the codebase. Analyze the files and provide insights relevant to the task.',
      },
    ],
  })) {
    fullResponse += chunk;
  }

  await addMessage(session, {
    role: 'assistant',
    content: fullResponse,
  });

  return fullResponse;
}

/**
 * Execute file operation step (create/modify/delete)
 */
async function executeFileStep(
  step: PlanStep,
  client: OllamaClient,
  session: ChatSession,
  _toolExecutor: ToolExecutor
): Promise<string> {
  // Add step description to session
  await addMessage(session, {
    role: 'user',
    content: `${step.type}: ${step.description}\nFiles: ${step.files.join(', ')}`,
  });

  let fullResponse = '';

  for await (const chunk of client.chat({
    model: session.model,
    messages: [
      ...session.messages,
      {
        role: 'system',
        content: `You are implementing this step. Use the appropriate tools to ${step.type} the files. Respond with the tool call in JSON format.`,
      },
    ],
  })) {
    fullResponse += chunk;
  }

  await addMessage(session, {
    role: 'assistant',
    content: fullResponse,
  });

  // The LLM should have returned a tool call
  // In a real implementation, we would parse and execute it here
  // For now, return the response
  return fullResponse;
}

/**
 * Execute command step
 */
async function executeCommandStep(
  step: PlanStep,
  client: OllamaClient,
  session: ChatSession,
  _toolExecutor: ToolExecutor
): Promise<string> {
  await addMessage(session, {
    role: 'user',
    content: `Execute: ${step.description}`,
  });

  let fullResponse = '';

  for await (const chunk of client.chat({
    model: session.model,
    messages: [
      ...session.messages,
      {
        role: 'system',
        content:
          'You are executing a command. Use the bash tool if needed. Respond with the tool call in JSON format.',
      },
    ],
  })) {
    fullResponse += chunk;
  }

  await addMessage(session, {
    role: 'assistant',
    content: fullResponse,
  });

  return fullResponse;
}

/**
 * Execute test step
 */
async function executeTestStep(
  step: PlanStep,
  client: OllamaClient,
  session: ChatSession,
  _toolExecutor: ToolExecutor
): Promise<string> {
  await addMessage(session, {
    role: 'user',
    content: `Test: ${step.description}`,
  });

  let fullResponse = '';

  for await (const chunk of client.chat({
    model: session.model,
    messages: [
      ...session.messages,
      {
        role: 'system',
        content:
          'You are running tests. Use the bash tool to run test commands. Report the results.',
      },
    ],
  })) {
    fullResponse += chunk;
  }

  await addMessage(session, {
    role: 'assistant',
    content: fullResponse,
  });

  return fullResponse;
}

/**
 * Resume plan execution from where it left off
 */
export async function resumePlan(
  planId: string,
  options: ExecutionOptions
): Promise<boolean> {
  const plan = await loadPlan(planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  if (plan.status === 'completed') {
    throw new Error('Plan is already completed');
  }

  return executePlan(planId, options);
}

/**
 * Skip a step in the plan
 */
export async function skipStep(planId: string, stepId: string): Promise<void> {
  await updateStepStatus(planId, stepId, 'skipped', 'Skipped by user');
}
