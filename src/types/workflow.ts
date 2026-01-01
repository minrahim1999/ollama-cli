/**
 * Workflow automation type definitions
 */

export type WorkflowStepType = 'bash' | 'test' | 'index' | 'git' | 'ai' | 'file';

export interface WorkflowStep {
  name: string;
  type: WorkflowStepType;
  command?: string | undefined;
  prompt?: string | undefined;
  file?: string | undefined;
  continueOnError?: boolean | undefined;
}

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables?: Record<string, string> | undefined;
}

export interface WorkflowResult {
  workflow: string;
  success: boolean;
  steps: StepResult[];
  duration: number;
}

export interface StepResult {
  step: string;
  success: boolean;
  output?: string | undefined;
  error?: string | undefined;
  duration: number;
}
