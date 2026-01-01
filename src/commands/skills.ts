/**
 * Skills command - Manage AI capability discovery
 */

import {
  getAllSkills,
  getMostUsedSkills,
  getSkillStats,
  suggestSkills,
} from '../skills/index.js';
import { colors } from '../ui/colors.js';
import { displayError, displayInfo } from '../ui/display.js';

export type SkillCommand = 'list' | 'popular' | 'stats' | 'suggest';

/**
 * Execute skills command
 */
export async function skillsCommand(command: SkillCommand, args: string[]): Promise<void> {
  switch (command) {
    case 'list':
      await listSkillsCmd();
      break;

    case 'popular':
      await popularSkillsCmd();
      break;

    case 'stats':
      await skillsStatsCmd();
      break;

    case 'suggest':
      await suggestSkillsCmd(args.join(' '));
      break;

    default:
      displayError(`Unknown command: ${command}`);
      console.log('');
      console.log('Available commands: list, popular, stats, suggest');
  }
}

/**
 * List all skills
 */
async function listSkillsCmd(): Promise<void> {
  const skills = await getAllSkills();

  console.log('');
  console.log(colors.primary('🎯 Available Skills'));
  console.log('');

  // Group by category
  const byCategory: Record<string, typeof skills> = {};
  for (const skill of skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category]!.push(skill);
  }

  for (const [category, categorySkills] of Object.entries(byCategory)) {
    console.log(colors.secondary(`${category.toUpperCase()}`));
    console.log('');

    for (const skill of categorySkills) {
      const usage = skill.usageCount > 0 ? colors.tertiary(` (used ${skill.usageCount}x)`) : '';
      console.log(`  ${colors.brand.primary(skill.name)}${usage}`);
      console.log(`  ${colors.tertiary(skill.description)}`);
      console.log('');
    }
  }
}

/**
 * Show most popular skills
 */
async function popularSkillsCmd(): Promise<void> {
  const skills = await getMostUsedSkills(10);

  console.log('');
  console.log(colors.primary('⭐ Most Popular Skills'));
  console.log('');

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i]!;
    const rank = colors.brand.primary(`${i + 1}.`);
    const success = (skill.successRate * 100).toFixed(0);

    console.log(`${rank} ${colors.secondary(skill.name)}`);
    console.log(`   ${colors.tertiary(`Used ${skill.usageCount} times`)} • ${colors.success(`${success}% success`)}`);
    console.log(`   ${skill.description}`);
    console.log('');
  }
}

/**
 * Show skill statistics
 */
async function skillsStatsCmd(): Promise<void> {
  const stats = await getSkillStats();

  console.log('');
  console.log(colors.primary('📊 Skill Statistics'));
  console.log('');

  console.log(`${colors.secondary('Total Skills:')} ${stats.totalSkills}`);
  console.log(`${colors.secondary('Total Usage:')} ${stats.totalUsage}`);
  console.log(`${colors.secondary('Average Success Rate:')} ${(stats.averageSuccessRate * 100).toFixed(1)}%`);
  console.log('');

  console.log(colors.secondary('Skills by Category:'));
  for (const [category, count] of Object.entries(stats.categoryCounts)) {
    console.log(`  ${colors.brand.primary(category)}: ${count}`);
  }
  console.log('');
}

/**
 * Suggest skills based on input
 */
async function suggestSkillsCmd(message: string): Promise<void> {
  if (!message) {
    displayInfo('Please provide a message to get skill suggestions');
    console.log('');
    console.log(colors.secondary('Example: ollama-cli skills suggest "help me fix this bug"'));
    return;
  }

  const suggestions = await suggestSkills(message);

  if (suggestions.length === 0) {
    displayInfo('No relevant skills found');
    return;
  }

  console.log('');
  console.log(colors.primary('💡 Suggested Skills'));
  console.log('');

  for (const suggestion of suggestions) {
    const relevancePercent = (suggestion.relevance * 100).toFixed(0);
    console.log(`${colors.brand.primary(suggestion.skill.name)} ${colors.tertiary(`(${relevancePercent}% match)`)}`);
    console.log(`  ${colors.secondary('Reason:')} ${suggestion.reason}`);
    console.log(`  ${colors.tertiary(suggestion.skill.description)}`);
    console.log('');
  }
}
