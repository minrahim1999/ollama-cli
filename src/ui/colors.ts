/**
 * Modern color system and design tokens for Ollama CLI
 * Provides gradients, semantic colors, and Unicode symbols
 */

import chalk from 'chalk';
import gradient from 'gradient-string';

/**
 * Semantic color palette
 */
export const colors = {
  // Brand colors (cyan/blue theme)
  brand: {
    primary: chalk.hex('#00D9FF'),      // Bright cyan
    secondary: chalk.hex('#0099FF'),    // Blue
    accent: chalk.hex('#00FF88'),       // Green-cyan
  },

  // Message role colors
  user: chalk.hex('#00D9FF'),           // Bright cyan
  assistant: chalk.hex('#00FF88'),      // Bright green
  system: chalk.hex('#888888'),         // Grey

  // Feedback state colors
  success: chalk.hex('#00FF88'),        // Bright green
  error: chalk.hex('#FF4444'),          // Red
  warning: chalk.hex('#FFAA00'),        // Orange
  info: chalk.hex('#0099FF'),           // Blue

  // Text hierarchy
  primary: chalk.white,                 // Primary content text
  secondary: chalk.hex('#AAAAAA'),      // Secondary text
  tertiary: chalk.hex('#666666'),       // Tertiary text
  dim: chalk.hex('#444444'),            // Dimmed text

  // Tool execution colors
  tool: {
    border: chalk.hex('#0099FF'),       // Blue border
    label: chalk.hex('#00D9FF'),        // Cyan label
    param: chalk.hex('#888888'),        // Grey parameters
    success: chalk.hex('#00FF88'),      // Green success
    pending: chalk.hex('#FFAA00'),      // Orange pending
  },
};

/**
 * Gradient definitions for headers and accents
 */
export const gradients: {
  brand: (text: string) => string;
  success: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
  subtle: (text: string) => string;
} = {
  // Brand gradient (cyan → blue)
  brand: gradient(['#00D9FF', '#0099FF', '#0066FF']),

  // Success gradient (green → cyan)
  success: gradient(['#00FF88', '#00D9FF']),

  // Warning gradient (orange → red)
  warning: gradient(['#FFAA00', '#FF4444']),

  // Info gradient (cyan → blue → purple)
  info: gradient(['#00D9FF', '#0099FF', '#6666FF']),

  // Subtle accent (light gradient for sections)
  subtle: gradient(['#AAAAAA', '#888888']),
};

/**
 * Unicode symbols for modern CLI design
 */
export const symbols = {
  // Status indicators
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',

  // Arrows and pointers
  arrowRight: '▶',
  arrowDown: '▼',
  bullet: '•',
  diamond: '◆',
  circle: '○',
  filledCircle: '●',

  // Separators
  divider: '─',
  verticalBar: '│',

  // Box corners (lighter style)
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',

  // Loading spinner frames
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],

  // Emojis (curated list for scanning)
  robot: '🤖',
  tool: '🔧',
  file: '📁',
  snapshot: '💾',
  search: '🔍',
  package: '📦',
  git: '🌳',
  web: '🌐',
  lightning: '⚡',
  sparkles: '✨',
  edit: '✏️',
  command: '🔨',
  book: '📖',
};
