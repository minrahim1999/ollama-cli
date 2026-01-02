/**
 * Analytics Command - View usage insights and reports
 */

import { generateUsageStats, generateToolReport, generateSessionReport } from '../analytics/reports.js';
import { getStoreInfo, clearAnalytics } from '../analytics/tracker.js';
import { colors } from '../ui/colors.js';
import { displayError, displayInfo, displaySuccess } from '../ui/display.js';
import { select } from '../utils/prompt.js';

export type AnalyticsCommand = 'overview' | 'tools' | 'session' | 'clear';

/**
 * Execute analytics command
 */
export async function analyticsCommand(command: AnalyticsCommand, args: string[]): Promise<void> {
  switch (command) {
    case 'overview':
      await showOverview();
      break;

    case 'tools':
      await showToolsReport(args[0]);
      break;

    case 'session':
      await showSessionReport(args[0]);
      break;

    case 'clear':
      await clearAnalyticsData();
      break;

    default:
      displayError(`Unknown command: ${command}`);
      console.log('');
      console.log('Available commands: overview, tools, session, clear');
  }
}

/**
 * Show usage overview
 */
async function showOverview(): Promise<void> {
  console.log('');
  console.log(colors.primary('📊 Usage Analytics Overview'));
  console.log('');

  const stats = await generateUsageStats();
  const storeInfo = await getStoreInfo();

  // Summary
  console.log(colors.secondary('Summary'));
  console.log(`  Total Sessions: ${colors.brand.primary(stats.totalSessions.toString())}`);
  console.log(`  Total Messages: ${colors.brand.primary(stats.totalMessages.toString())}`);
  console.log(`  Total Tools Used: ${colors.brand.primary(stats.totalTools.toString())}`);
  console.log(`  Total Tokens: ${colors.brand.primary(stats.totalTokens.toLocaleString())}`);
  console.log('');

  // Averages
  console.log(colors.secondary('Averages'));
  console.log(
    `  Session Length: ${colors.tertiary(formatDuration(stats.averageSessionLength))}`
  );
  console.log(
    `  Message Length: ${colors.tertiary(Math.round(stats.averageMessageLength).toString())} chars`
  );
  console.log('');

  // Success rates
  console.log(colors.secondary('Success Rates'));
  console.log(
    `  Tool Success Rate: ${getSuccessColor((stats.toolSuccessRate * 100).toFixed(1) + '%')}`
  );
  console.log(
    `  Error Rate: ${getErrorColor((stats.errorRate * 100).toFixed(1) + '%')}`
  );
  console.log('');

  // Most used tools
  if (stats.mostUsedTools.length > 0) {
    console.log(colors.secondary('Most Used Tools (Top 5)'));
    for (let i = 0; i < Math.min(5, stats.mostUsedTools.length); i++) {
      const tool = stats.mostUsedTools[i]!;
      const successRate = tool.count > 0 ? (tool.successCount / tool.count) * 100 : 0;
      console.log(
        `  ${i + 1}. ${colors.brand.primary(tool.name)} - ${tool.count} uses (${successRate.toFixed(0)}% success)`
      );
    }
    console.log('');
  }

  // Most used models
  if (stats.mostUsedModels.length > 0) {
    console.log(colors.secondary('Most Used Models'));
    for (const model of stats.mostUsedModels.slice(0, 3)) {
      console.log(
        `  ${colors.brand.primary(model.name)} - ${model.count} sessions, ${model.totalTokens.toLocaleString()} tokens`
      );
    }
    console.log('');
  }

  // Peak usage hours
  if (stats.peakUsageHours.length > 0) {
    console.log(colors.secondary('Peak Usage Hours'));
    console.log(
      `  ${stats.peakUsageHours.map((h) => `${h}:00`).join(', ')}`
    );
    console.log('');
  }

  // Recent activity
  const recentDays = Object.entries(stats.sessionsByDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  if (recentDays.length > 0) {
    console.log(colors.secondary('Recent Activity (Last 7 Days)'));
    for (const [date, count] of recentDays) {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`  ${date}: ${colors.tertiary(bar)} ${count}`);
    }
    console.log('');
  }

  // Storage info
  console.log(colors.secondary('Storage'));
  console.log(`  Total Events: ${storeInfo.totalEvents.toLocaleString()}`);
  console.log(`  Storage Size: ${formatBytes(storeInfo.storageSize)}`);
  if (storeInfo.oldestEvent) {
    console.log(`  Oldest Event: ${new Date(storeInfo.oldestEvent).toLocaleDateString()}`);
  }
  console.log('');
}

/**
 * Show tools report
 */
async function showToolsReport(toolName?: string): Promise<void> {
  if (!toolName) {
    displayInfo('Please specify a tool name');
    console.log('');
    console.log(colors.secondary('Example: ollama-cli analytics tools read_file'));
    return;
  }

  console.log('');
  console.log(colors.primary(`🔧 Tool Report: ${toolName}`));
  console.log('');

  const report = await generateToolReport(toolName);

  console.log(colors.secondary('Statistics'));
  console.log(`  Total Executions: ${colors.brand.primary(report.totalExecutions.toString())}`);
  console.log(`  Successful: ${colors.success(report.successCount.toString())}`);
  console.log(`  Errors: ${colors.error(report.errorCount.toString())}`);
  console.log(
    `  Success Rate: ${getSuccessColor((report.successRate * 100).toFixed(1) + '%')}`
  );
  console.log(
    `  Average Duration: ${colors.tertiary(report.averageDuration.toFixed(0))}ms`
  );
  console.log('');

  if (report.recentErrors.length > 0) {
    console.log(colors.secondary('Recent Errors'));
    for (const error of report.recentErrors) {
      const date = new Date(error.timestamp).toLocaleString();
      console.log(`  ${colors.tertiary(date)}`);
      console.log(`  ${colors.error(error.error)}`);
      console.log('');
    }
  } else {
    console.log(colors.success('No recent errors! 🎉'));
    console.log('');
  }
}

/**
 * Show session report
 */
async function showSessionReport(sessionId?: string): Promise<void> {
  if (!sessionId) {
    displayInfo('Please specify a session ID');
    console.log('');
    console.log(colors.secondary('Example: ollama-cli analytics session <session-id>'));
    return;
  }

  console.log('');
  console.log(colors.primary(`📝 Session Report: ${sessionId}`));
  console.log('');

  const report = await generateSessionReport(sessionId);

  console.log(colors.secondary('Details'));
  if (report.model) {
    console.log(`  Model: ${colors.brand.primary(report.model)}`);
  }
  if (report.assistant) {
    console.log(`  Assistant: ${colors.brand.primary(report.assistant)}`);
  }
  if (report.agent) {
    console.log(`  Agent: ${colors.brand.primary(report.agent)}`);
  }
  if (report.startTime) {
    console.log(`  Start Time: ${colors.tertiary(new Date(report.startTime).toLocaleString())}`);
  }
  if (report.endTime) {
    console.log(`  End Time: ${colors.tertiary(new Date(report.endTime).toLocaleString())}`);
  }
  if (report.duration !== undefined) {
    console.log(`  Duration: ${colors.tertiary(formatDuration(report.duration))}`);
  }
  console.log('');

  console.log(colors.secondary('Activity'));
  console.log(`  Messages: ${colors.brand.primary(report.messageCount.toString())}`);
  console.log(`  Tools Used: ${colors.brand.primary(report.toolCount.toString())}`);
  console.log(`  Total Tokens: ${colors.brand.primary(report.totalTokens.toLocaleString())}`);
  console.log('');

  if (report.toolsUsed.length > 0) {
    console.log(colors.secondary('Tools Used'));
    for (const tool of report.toolsUsed) {
      console.log(`  • ${colors.tertiary(tool)}`);
    }
    console.log('');
  }
}

/**
 * Clear analytics data
 */
async function clearAnalyticsData(): Promise<void> {
  console.log('');
  console.log(colors.warning('⚠️  This will permanently delete all analytics data.'));
  console.log('');

  const confirm = await select('Are you sure?', ['Yes', 'No']);

  if (confirm === 'Yes') {
    await clearAnalytics();
    displaySuccess('Analytics data cleared');
  } else {
    displayInfo('Cancelled');
  }

  console.log('');
}

/**
 * Helper: Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

/**
 * Helper: Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Helper: Get color for success rate
 */
function getSuccessColor(text: string): string {
  const rate = parseFloat(text);
  if (rate >= 90) {
    return colors.success(text);
  } else if (rate >= 70) {
    return colors.warning(text);
  } else {
    return colors.error(text);
  }
}

/**
 * Helper: Get color for error rate
 */
function getErrorColor(text: string): string {
  const rate = parseFloat(text);
  if (rate < 5) {
    return colors.success(text);
  } else if (rate < 15) {
    return colors.warning(text);
  } else {
    return colors.error(text);
  }
}
