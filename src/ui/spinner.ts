/**
 * Spinner utilities for loading states
 */

import ora, { Ora } from 'ora';
import { colors } from './colors.js';

let currentSpinner: Ora | null = null;

/**
 * Start a spinner with a message
 */
export function startSpinner(message: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }

  currentSpinner = ora({
    text: colors.secondary(message),
    color: 'cyan',
    spinner: 'dots', // Modern spinner style
  }).start();

  return currentSpinner;
}

/**
 * Update spinner message
 */
export function updateSpinner(message: string): void {
  if (currentSpinner) {
    currentSpinner.text = colors.secondary(message);
  }
}

/**
 * Stop spinner with success
 */
export function succeedSpinner(message?: string): void {
  if (currentSpinner) {
    if (message) {
      currentSpinner.succeed(colors.primary(message));
    } else {
      currentSpinner.stop();
    }
    currentSpinner = null;
  }
}

/**
 * Stop spinner with failure
 */
export function failSpinner(message?: string): void {
  if (currentSpinner) {
    if (message) {
      currentSpinner.fail(colors.error(message));
    } else {
      currentSpinner.stop();
    }
    currentSpinner = null;
  }
}

/**
 * Stop spinner
 */
export function stopSpinner(): void {
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
}
