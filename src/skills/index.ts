/**
 * Skills System - Auto-discovery of AI capabilities
 * Allows AI to discover, register, and suggest its own capabilities
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  examples: string[];
  usageCount: number;
  successRate: number;
  createdAt: string;
  lastUsed?: string | undefined;
}

export interface SkillSuggestion {
  skill: Skill;
  relevance: number; // 0-1
  reason: string;
}

export interface SkillRegistry {
  skills: Skill[];
  lastUpdated: string;
}

// Default skills that come with the system
const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Analyze code for bugs, security issues, and best practices',
    category: 'development',
    examples: [
      'Review this JavaScript function for security vulnerabilities',
      'Check this code for potential bugs',
      'Analyze this module for performance issues',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'explain-code',
    name: 'Code Explanation',
    description: 'Explain how code works in plain language',
    category: 'development',
    examples: [
      'Explain what this function does',
      'How does this algorithm work?',
      'Break down this code step by step',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'debug-help',
    name: 'Debugging Assistant',
    description: 'Help identify and fix bugs in code',
    category: 'development',
    examples: [
      'Why is this function returning undefined?',
      'Help me fix this error',
      'Debug this code that is not working as expected',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'optimize-code',
    name: 'Code Optimization',
    description: 'Suggest performance improvements and optimizations',
    category: 'development',
    examples: [
      'How can I make this code faster?',
      'Optimize this database query',
      'Improve the performance of this function',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'write-tests',
    name: 'Test Generation',
    description: 'Generate unit tests for code',
    category: 'development',
    examples: [
      'Write tests for this function',
      'Generate unit tests for this module',
      'Create test cases for this API endpoint',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'refactor',
    name: 'Code Refactoring',
    description: 'Improve code structure without changing functionality',
    category: 'development',
    examples: [
      'Refactor this code to be more maintainable',
      'Clean up this function',
      'Improve the structure of this module',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'documentation',
    name: 'Documentation Writer',
    description: 'Generate comprehensive documentation',
    category: 'documentation',
    examples: [
      'Write documentation for this API',
      'Generate JSDoc comments for this function',
      'Create a README for this project',
    ],
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get skills registry file path
 */
function getSkillsPath(): string {
  return path.join(homedir(), '.ollama-cli', 'skills.json');
}

/**
 * Load skills registry
 */
export async function loadSkills(): Promise<SkillRegistry> {
  try {
    const skillsPath = getSkillsPath();
    const content = await fs.readFile(skillsPath, 'utf-8');
    return JSON.parse(content) as SkillRegistry;
  } catch {
    // Return default skills if no registry exists
    return {
      skills: DEFAULT_SKILLS,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Save skills registry
 */
export async function saveSkills(registry: SkillRegistry): Promise<void> {
  const skillsDir = path.dirname(getSkillsPath());
  await fs.mkdir(skillsDir, { recursive: true });

  const skillsPath = getSkillsPath();
  await fs.writeFile(
    skillsPath,
    JSON.stringify({ ...registry, lastUpdated: new Date().toISOString() }, null, 2),
    'utf-8'
  );
}

/**
 * Get all skills
 */
export async function getAllSkills(): Promise<Skill[]> {
  const registry = await loadSkills();
  return registry.skills;
}

/**
 * Get skill by ID
 */
export async function getSkill(id: string): Promise<Skill | null> {
  const skills = await getAllSkills();
  return skills.find((s) => s.id === id) || null;
}

/**
 * Add a new skill
 */
export async function addSkill(skill: Omit<Skill, 'id' | 'usageCount' | 'successRate' | 'createdAt'>): Promise<Skill> {
  const registry = await loadSkills();

  const newSkill: Skill = {
    ...skill,
    id: `custom-${Date.now()}`,
    usageCount: 0,
    successRate: 1.0,
    createdAt: new Date().toISOString(),
  };

  registry.skills.push(newSkill);
  await saveSkills(registry);

  return newSkill;
}

/**
 * Update skill usage
 */
export async function recordSkillUsage(skillId: string, success: boolean): Promise<void> {
  const registry = await loadSkills();
  const skill = registry.skills.find((s) => s.id === skillId);

  if (skill) {
    skill.usageCount++;
    skill.lastUsed = new Date().toISOString();

    // Update success rate (weighted average)
    const weight = 0.2; // New success rate has 20% weight
    skill.successRate = skill.successRate * (1 - weight) + (success ? 1 : 0) * weight;

    await saveSkills(registry);
  }
}

/**
 * Suggest skills based on user message
 */
export async function suggestSkills(userMessage: string): Promise<SkillSuggestion[]> {
  const skills = await getAllSkills();
  const suggestions: SkillSuggestion[] = [];

  const lowerMessage = userMessage.toLowerCase();

  for (const skill of skills) {
    let relevance = 0;
    let reason = '';

    // Check if skill name or description matches
    if (lowerMessage.includes(skill.name.toLowerCase())) {
      relevance += 0.5;
      reason = `Matches skill: ${skill.name}`;
    }

    // Check if any keywords in description match
    const descWords = skill.description.toLowerCase().split(' ');
    const matchingWords = descWords.filter((word) => lowerMessage.includes(word));
    if (matchingWords.length > 0) {
      relevance += matchingWords.length * 0.1;
      reason = reason || `Related to: ${matchingWords.join(', ')}`;
    }

    // Check examples
    for (const example of skill.examples) {
      const exampleWords = example.toLowerCase().split(' ');
      const matches = exampleWords.filter((word) => word.length > 3 && lowerMessage.includes(word));
      if (matches.length > 2) {
        relevance += 0.3;
        reason = reason || `Similar to example: "${example}"`;
      }
    }

    // Bonus for frequently used skills
    if (skill.usageCount > 10) {
      relevance += 0.1;
    }

    // Bonus for high success rate
    relevance *= skill.successRate;

    if (relevance > 0.3) {
      suggestions.push({
        skill,
        relevance: Math.min(relevance, 1.0),
        reason,
      });
    }
  }

  // Sort by relevance (highest first)
  suggestions.sort((a, b) => b.relevance - a.relevance);

  // Return top 3 suggestions
  return suggestions.slice(0, 3);
}

/**
 * Get skills by category
 */
export async function getSkillsByCategory(category: string): Promise<Skill[]> {
  const skills = await getAllSkills();
  return skills.filter((s) => s.category === category);
}

/**
 * Get most used skills
 */
export async function getMostUsedSkills(limit: number = 5): Promise<Skill[]> {
  const skills = await getAllSkills();
  return skills.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
}

/**
 * Get skill statistics
 */
export async function getSkillStats(): Promise<{
  totalSkills: number;
  totalUsage: number;
  averageSuccessRate: number;
  categoryCounts: Record<string, number>;
}> {
  const skills = await getAllSkills();

  const categoryCounts: Record<string, number> = {};
  let totalUsage = 0;
  let totalSuccessRate = 0;

  for (const skill of skills) {
    categoryCounts[skill.category] = (categoryCounts[skill.category] || 0) + 1;
    totalUsage += skill.usageCount;
    totalSuccessRate += skill.successRate;
  }

  return {
    totalSkills: skills.length,
    totalUsage,
    averageSuccessRate: skills.length > 0 ? totalSuccessRate / skills.length : 0,
    categoryCounts,
  };
}
