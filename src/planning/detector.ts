/**
 * Plan detector - Determines when planning mode should be triggered
 */

export interface PlanDetectionResult {
  shouldPlan: boolean;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Analyze user request to determine if planning is needed
 */
export function shouldTriggerPlanning(userMessage: string): PlanDetectionResult {
  const message = userMessage.toLowerCase();

  // Keywords that indicate complex tasks
  const complexityKeywords = [
    'implement',
    'create',
    'build',
    'add feature',
    'refactor',
    'migrate',
    'integrate',
    'set up',
    'setup',
    'configure',
    'optimize',
    'redesign',
  ];

  // Keywords that indicate multi-step work
  const multiStepKeywords = [
    'multiple',
    'several',
    'all',
    'entire',
    'complete',
    'full',
    'across',
    'throughout',
  ];

  // Keywords that indicate file operations
  const fileOperationKeywords = [
    'file',
    'files',
    'component',
    'components',
    'module',
    'modules',
    'directory',
    'folder',
  ];

  // Keywords that suggest planning is needed
  const planningKeywords = [
    'how should i',
    'what is the best way',
    'help me plan',
    'help me design',
    'architecture',
    'strategy',
    'approach',
  ];

  // Explicit planning requests
  if (
    message.includes('create a plan') ||
    message.includes('make a plan') ||
    message.includes('plan out')
  ) {
    return {
      shouldPlan: true,
      reason: 'User explicitly requested planning',
      confidence: 'high',
    };
  }

  // Check for planning-related questions
  const hasPlanningKeyword = planningKeywords.some((keyword) => message.includes(keyword));
  if (hasPlanningKeyword) {
    return {
      shouldPlan: true,
      reason: 'Request involves strategic planning or architectural decisions',
      confidence: 'high',
    };
  }

  // Count indicators
  let complexityScore = 0;
  let multiStepScore = 0;
  let fileOperationScore = 0;

  for (const keyword of complexityKeywords) {
    if (message.includes(keyword)) {
      complexityScore++;
    }
  }

  for (const keyword of multiStepKeywords) {
    if (message.includes(keyword)) {
      multiStepScore++;
    }
  }

  for (const keyword of fileOperationKeywords) {
    if (message.includes(keyword)) {
      fileOperationScore++;
    }
  }

  // Check for "and" or commas indicating multiple tasks
  const hasMultipleTasks =
    (message.match(/and/g) || []).length >= 2 ||
    (message.match(/,/g) || []).length >= 2;

  // Check message length (longer messages often indicate complex requests)
  const isLongRequest = userMessage.length > 200;

  // Calculate total score
  const totalScore =
    complexityScore * 2 +
    multiStepScore * 2 +
    fileOperationScore +
    (hasMultipleTasks ? 3 : 0) +
    (isLongRequest ? 2 : 0);

  // High confidence planning needed
  if (totalScore >= 7) {
    return {
      shouldPlan: true,
      reason: 'Complex multi-step task detected with multiple file operations',
      confidence: 'high',
    };
  }

  // Medium confidence planning needed
  if (totalScore >= 4) {
    return {
      shouldPlan: true,
      reason: 'Task appears to require multiple steps or file modifications',
      confidence: 'medium',
    };
  }

  // Low complexity - no planning needed
  return {
    shouldPlan: false,
    reason: 'Task appears straightforward enough to execute directly',
    confidence: complexityScore > 0 ? 'medium' : 'high',
  };
}

/**
 * Check if task type requires planning
 */
export function taskTypeRequiresPlanning(taskType: string): boolean {
  const planningRequiredTasks = [
    'implement-feature',
    'refactor',
    'migrate',
    'integrate',
    'architecture',
    'multi-file-edit',
  ];

  return planningRequiredTasks.includes(taskType);
}

/**
 * Estimate task complexity based on description
 */
export function estimateComplexity(
  description: string
): 'low' | 'medium' | 'high' {
  const message = description.toLowerCase();

  // High complexity indicators
  const highComplexityIndicators = [
    'architecture',
    'migrate',
    'refactor entire',
    'complete overhaul',
    'redesign',
    'integrate multiple',
  ];

  // Medium complexity indicators
  const mediumComplexityIndicators = [
    'implement',
    'create new',
    'add feature',
    'multiple files',
    'several components',
  ];

  for (const indicator of highComplexityIndicators) {
    if (message.includes(indicator)) {
      return 'high';
    }
  }

  for (const indicator of mediumComplexityIndicators) {
    if (message.includes(indicator)) {
      return 'medium';
    }
  }

  return 'low';
}
