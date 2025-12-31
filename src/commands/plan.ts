/**
 * Plan command - Manage execution plans
 */

import { listPlans, loadPlan, deletePlan, getPlanProgress } from '../planning/index.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';

export type PlanCommand = 'list' | 'show' | 'delete';

/**
 * Main plan command handler
 */
export async function planCommand(command: PlanCommand, args: string[]): Promise<void> {
  switch (command) {
    case 'list':
      await listPlansCmd();
      break;

    case 'show':
      if (args.length === 0) {
        displayError('Usage: ollama-cli plan show <plan-id>');
        return;
      }
      await showPlanCmd(args[0]!);
      break;

    case 'delete':
      if (args.length === 0) {
        displayError('Usage: ollama-cli plan delete <plan-id>');
        return;
      }
      await deletePlanCmd(args[0]!);
      break;

    default:
      displayError(`Unknown command: ${command}`, 'Use: list, show, delete');
  }
}

/**
 * List all plans
 */
async function listPlansCmd(): Promise<void> {
  try {
    const plans = await listPlans();

    if (plans.length === 0) {
      displayInfo('No plans found');
      return;
    }

    console.log('');
    console.log(gradients.brand('Execution Plans'));
    console.log('');

    for (const plan of plans) {
      const statusIcon =
        plan.status === 'completed' ? '✅' :
        plan.status === 'in-progress' ? '🔄' :
        plan.status === 'approved' ? '👍' :
        plan.status === 'cancelled' ? '❌' :
        '📝';

      const progress = `${plan.completedSteps}/${plan.totalSteps}`;

      console.log(`${statusIcon} ${colors.brand.primary(plan.name)}`);
      console.log(`   ${colors.tertiary(plan.description)}`);
      console.log(
        `   ${colors.dim(`ID: ${plan.id.substring(0, 8)} | Status: ${plan.status} | Progress: ${progress}`)}`
      );
      console.log(
        `   ${colors.dim(`Created: ${new Date(plan.createdAt).toLocaleString()}`)}`
      );
      console.log('');
    }

    console.log(colors.tertiary(`Total: ${plans.length} plans`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to list plans');
  }
}

/**
 * Show plan details
 */
async function showPlanCmd(planId: string): Promise<void> {
  try {
    const plan = await loadPlan(planId);

    if (!plan) {
      displayError(`Plan not found: ${planId}`);
      return;
    }

    console.log('');
    console.log(gradients.brand(plan.name));
    console.log('');

    console.log(colors.secondary('Status:'));
    console.log(`  ${plan.status}`);
    console.log('');

    console.log(colors.secondary('Description:'));
    console.log(`  ${plan.description}`);
    console.log('');

    console.log(colors.secondary('User Request:'));
    console.log(`  ${plan.userRequest}`);
    console.log('');

    const progress = getPlanProgress(plan);
    console.log(colors.secondary('Progress:'));
    console.log(
      `  ${progress.completedSteps}/${progress.totalSteps} steps completed (${progress.percentComplete.toFixed(0)}%)`
    );
    console.log('');

    if (progress.currentStep) {
      console.log(colors.secondary('Current Step:'));
      console.log(`  ${progress.currentStep.title}`);
      console.log('');
    }

    console.log(colors.secondary('Steps:'));
    console.log('');

    for (const step of plan.steps) {
      const statusIcon =
        step.status === 'completed' ? '✅' :
        step.status === 'in-progress' ? '🔄' :
        step.status === 'failed' ? '❌' :
        step.status === 'skipped' ? '⏭️' :
        '⏸️';

      console.log(
        `  ${statusIcon} ${step.order}. ${colors.brand.primary(step.title)} (${step.type})`
      );
      console.log(`     ${colors.tertiary(step.description)}`);

      if (step.files.length > 0) {
        console.log(`     ${colors.dim(`Files: ${step.files.join(', ')}`)}`);
      }

      if (step.error) {
        console.log(`     ${colors.error(`Error: ${step.error}`)}`);
      }

      console.log('');
    }

    if (plan.context.assumptions.length > 0) {
      console.log(colors.secondary('Assumptions:'));
      for (const assumption of plan.context.assumptions) {
        console.log(`  • ${assumption}`);
      }
      console.log('');
    }

    if (plan.context.risks.length > 0) {
      console.log(colors.secondary('Risks:'));
      for (const risk of plan.context.risks) {
        console.log(`  • ${risk}`);
      }
      console.log('');
    }

    console.log(colors.dim(`Plan ID: ${plan.id}`));
    console.log(colors.dim(`Session: ${plan.sessionId}`));
    console.log(colors.dim(`Created: ${new Date(plan.createdAt).toLocaleString()}`));
    console.log(colors.dim(`Updated: ${new Date(plan.updatedAt).toLocaleString()}`));
    console.log('');

    console.log(colors.secondary('Tip:'));
    console.log(
      `  ${colors.tertiary(`View markdown: cat ~/.ollama-cli/plans/${plan.id}.md`)}`
    );
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to show plan');
  }
}

/**
 * Delete a plan
 */
async function deletePlanCmd(planId: string): Promise<void> {
  try {
    const plan = await loadPlan(planId);

    if (!plan) {
      displayError(`Plan not found: ${planId}`);
      return;
    }

    const deleted = await deletePlan(planId);

    if (deleted) {
      displaySuccess(`Plan deleted: ${plan.name}`);
    } else {
      displayError('Failed to delete plan');
    }
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to delete plan');
  }
}
