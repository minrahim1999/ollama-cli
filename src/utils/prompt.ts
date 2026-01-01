/**
 * User prompts and confirmations
 */

import readline from 'readline';

/**
 * Ask user a yes/no question
 */
export async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    const defaultText = defaultYes ? '[Y/n]' : '[y/N]';
    rl.question(`${question} ${defaultText}: `, answer => {
      rl.close();

      const normalized = answer.trim().toLowerCase();

      if (normalized === '') {
        resolve(defaultYes);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

/**
 * Ask user for text input
 */
export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    const defaultText = defaultValue ? `(default: ${defaultValue})` : '';
    rl.question(`${question} ${defaultText}: `, answer => {
      rl.close();

      const value = answer.trim();
      resolve(value || defaultValue || '');
    });
  });
}

/**
 * Ask user to select from options
 */
export async function select(question: string, options: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    console.log(question);
    options.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt}`);
    });

    rl.question('\nSelect option (1-' + options.length + '): ', answer => {
      rl.close();

      const index = parseInt(answer.trim()) - 1;

      if (index >= 0 && index < options.length) {
        resolve(options[index]!);
      } else {
        resolve(options[0]!);
      }
    });
  });
}
