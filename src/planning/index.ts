/**
 * Planning system - Core functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  Plan,
  PlanStep,
  PlanSummary,
  PlanStatus,
  StepStatus,
  CreatePlanParams,
  PlanProgress,
} from '../types/plan.js';

const PLANS_DIR = path.join(process.env['HOME'] || '~', '.ollama-cli', 'plans');

/**
 * Ensure plans directory exists
 */
async function ensurePlansDir(): Promise<void> {
  await fs.mkdir(PLANS_DIR, { recursive: true });
}

/**
 * Create a new plan
 */
export async function createPlan(params: CreatePlanParams): Promise<Plan> {
  await ensurePlansDir();

  const now = new Date().toISOString();
  const plan: Plan = {
    id: randomUUID(),
    name: params.name,
    description: params.description,
    userRequest: params.userRequest,
    sessionId: params.sessionId,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    steps: [],
    context: {
      filesAnalyzed: [],
      assumptions: [],
      risks: [],
      workingDirectory: params.workingDirectory,
      model: params.model,
    },
  };

  await savePlan(plan);
  return plan;
}

/**
 * Save plan to disk
 */
export async function savePlan(plan: Plan): Promise<void> {
  await ensurePlansDir();

  const planPath = path.join(PLANS_DIR, `${plan.id}.json`);
  const tempPath = `${planPath}.tmp`;

  plan.updatedAt = new Date().toISOString();

  await fs.writeFile(tempPath, JSON.stringify(plan, null, 2), 'utf-8');
  await fs.rename(tempPath, planPath);

  // Also save as markdown for readability
  const mdPath = path.join(PLANS_DIR, `${plan.id}.md`);
  const markdown = formatPlanAsMarkdown(plan);
  await fs.writeFile(mdPath, markdown, 'utf-8');
}

/**
 * Load plan from disk
 */
export async function loadPlan(planId: string): Promise<Plan | null> {
  try {
    const planPath = path.join(PLANS_DIR, `${planId}.json`);
    const content = await fs.readFile(planPath, 'utf-8');
    return JSON.parse(content) as Plan;
  } catch {
    return null;
  }
}

/**
 * List all plans
 */
export async function listPlans(): Promise<PlanSummary[]> {
  await ensurePlansDir();

  try {
    const files = await fs.readdir(PLANS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const summaries: PlanSummary[] = [];

    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(PLANS_DIR, file), 'utf-8');
        const plan = JSON.parse(content) as Plan;

        summaries.push({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          status: plan.status,
          createdAt: plan.createdAt,
          totalSteps: plan.steps.length,
          completedSteps: plan.steps.filter((s) => s.status === 'completed').length,
        });
      } catch {
        // Skip invalid files
        continue;
      }
    }

    // Sort by creation date (newest first)
    summaries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return summaries;
  } catch {
    return [];
  }
}

/**
 * Delete a plan
 */
export async function deletePlan(planId: string): Promise<boolean> {
  try {
    const jsonPath = path.join(PLANS_DIR, `${planId}.json`);
    const mdPath = path.join(PLANS_DIR, `${planId}.md`);

    await fs.unlink(jsonPath);

    try {
      await fs.unlink(mdPath);
    } catch {
      // MD file might not exist
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Add a step to a plan
 */
export async function addStep(planId: string, step: Omit<PlanStep, 'id' | 'order'>): Promise<Plan | null> {
  const plan = await loadPlan(planId);
  if (!plan) {
    return null;
  }

  const newStep: PlanStep = {
    ...step,
    id: randomUUID(),
    order: plan.steps.length + 1,
  };

  plan.steps.push(newStep);
  await savePlan(plan);

  return plan;
}

/**
 * Update step status
 */
export async function updateStepStatus(
  planId: string,
  stepId: string,
  status: StepStatus,
  result?: string | undefined,
  error?: string | undefined
): Promise<Plan | null> {
  const plan = await loadPlan(planId);
  if (!plan) {
    return null;
  }

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) {
    return null;
  }

  step.status = status;
  if (result !== undefined) {
    step.result = result;
  }
  if (error !== undefined) {
    step.error = error;
  }

  await savePlan(plan);
  return plan;
}

/**
 * Update plan status
 */
export async function updatePlanStatus(
  planId: string,
  status: PlanStatus
): Promise<Plan | null> {
  const plan = await loadPlan(planId);
  if (!plan) {
    return null;
  }

  plan.status = status;
  await savePlan(plan);

  return plan;
}

/**
 * Get plan progress
 */
export function getPlanProgress(plan: Plan): PlanProgress {
  const totalSteps = plan.steps.length;
  const completedSteps = plan.steps.filter((s) => s.status === 'completed').length;
  const currentStep = plan.steps.find((s) => s.status === 'in-progress');

  return {
    totalSteps,
    completedSteps,
    currentStep,
    percentComplete: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
  };
}

/**
 * Format plan as Markdown
 */
export function formatPlanAsMarkdown(plan: Plan): string {
  const lines: string[] = [];

  lines.push(`# ${plan.name}`);
  lines.push('');
  lines.push(`**Status:** ${plan.status}`);
  lines.push(`**Created:** ${new Date(plan.createdAt).toLocaleString()}`);
  lines.push(`**Updated:** ${new Date(plan.updatedAt).toLocaleString()}`);
  lines.push('');

  lines.push('## Description');
  lines.push('');
  lines.push(plan.description);
  lines.push('');

  lines.push('## User Request');
  lines.push('');
  lines.push(plan.userRequest);
  lines.push('');

  if (plan.context.assumptions.length > 0) {
    lines.push('## Assumptions');
    lines.push('');
    for (const assumption of plan.context.assumptions) {
      lines.push(`- ${assumption}`);
    }
    lines.push('');
  }

  if (plan.context.risks.length > 0) {
    lines.push('## Risks');
    lines.push('');
    for (const risk of plan.context.risks) {
      lines.push(`- ${risk}`);
    }
    lines.push('');
  }

  lines.push('## Implementation Steps');
  lines.push('');

  for (const step of plan.steps) {
    const statusIcon =
      step.status === 'completed' ? '✅' :
      step.status === 'in-progress' ? '🔄' :
      step.status === 'failed' ? '❌' :
      step.status === 'skipped' ? '⏭️' :
      '⏸️';

    lines.push(`### ${step.order}. ${step.title} ${statusIcon}`);
    lines.push('');
    lines.push(`**Type:** ${step.type}`);
    lines.push(`**Complexity:** ${step.estimatedComplexity}`);
    lines.push('');
    lines.push(step.description);
    lines.push('');

    if (step.files.length > 0) {
      lines.push('**Files:**');
      for (const file of step.files) {
        lines.push(`- ${file}`);
      }
      lines.push('');
    }

    if (step.result) {
      lines.push('**Result:**');
      lines.push(step.result);
      lines.push('');
    }

    if (step.error) {
      lines.push('**Error:**');
      lines.push(step.error);
      lines.push('');
    }
  }

  if (plan.context.filesAnalyzed.length > 0) {
    lines.push('## Files Analyzed');
    lines.push('');
    for (const file of plan.context.filesAnalyzed) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`*Plan ID: ${plan.id}*`);
  lines.push(`*Session: ${plan.sessionId}*`);
  lines.push(`*Model: ${plan.context.model}*`);

  return lines.join('\n');
}

/**
 * Get next pending step
 */
export function getNextStep(plan: Plan): PlanStep | null {
  return plan.steps.find((s) => s.status === 'pending') || null;
}

/**
 * Check if plan is complete
 */
export function isPlanComplete(plan: Plan): boolean {
  return plan.steps.every((s) => s.status === 'completed' || s.status === 'skipped');
}
