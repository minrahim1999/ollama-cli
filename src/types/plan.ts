/**
 * Planning system types
 */

export type PlanStatus = 'draft' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'skipped' | 'failed';
export type StepType = 'explore' | 'create' | 'modify' | 'delete' | 'execute' | 'test';
export type Complexity = 'low' | 'medium' | 'high';

export interface PlanStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: StepType;
  files: string[];
  status: StepStatus;
  estimatedComplexity: Complexity;
  result?: string | undefined; // Result after execution
  error?: string | undefined; // Error if failed
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  userRequest: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: PlanStatus;
  steps: PlanStep[];
  context: PlanContext;
}

export interface PlanContext {
  filesAnalyzed: string[];
  assumptions: string[];
  risks: string[];
  workingDirectory: string;
  model: string;
}

export interface PlanSummary {
  id: string;
  name: string;
  description: string;
  status: PlanStatus;
  createdAt: string;
  totalSteps: number;
  completedSteps: number;
}

export interface CreatePlanParams {
  name: string;
  description: string;
  userRequest: string;
  sessionId: string;
  workingDirectory: string;
  model: string;
}

export interface PlanProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep?: PlanStep | undefined;
  percentComplete: number;
}
