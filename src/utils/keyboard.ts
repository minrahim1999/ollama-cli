/**
 * Enhanced keyboard navigation and selection
 */

import readline from 'readline';
import { colors } from '../ui/colors.js';

export interface SelectOption {
  label: string;
  value: string;
  description?: string | undefined;
}

/**
 * Interactive selection menu with keyboard navigation
 */
export async function selectWithKeyboard(
  question: string,
  options: SelectOption[],
  config: {
    defaultIndex?: number;
    cancelable?: boolean;
  } = {}
): Promise<string | null> {
  return new Promise((resolve) => {
    let selectedIndex = config.defaultIndex ?? 0;
    const { stdin, stdout } = process;

    // Check if stdin is a TTY
    if (!stdin.isTTY) {
      // Fallback to simple prompt
      console.log(question);
      options.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt.label}`);
      });
      const rl = readline.createInterface({ input: stdin, output: stdout });
      rl.question('\nSelect option (1-' + options.length + '): ', (answer) => {
        rl.close();
        const index = parseInt(answer.trim()) - 1;
        if (index >= 0 && index < options.length) {
          resolve(options[index]!.value);
        } else {
          resolve(null);
        }
      });
      return;
    }

    // Enable raw mode for key capture
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);

    const render = () => {
      // Clear previous render
      stdout.write('\x1B[?25l'); // Hide cursor

      console.log('');
      console.log(colors.secondary(question));
      console.log(colors.dim('Use ↑↓ arrow keys to navigate, Enter to select' + (config.cancelable ? ', Esc to cancel' : '')));
      console.log('');

      options.forEach((opt, i) => {
        const isSelected = i === selectedIndex;
        const prefix = isSelected ? colors.brand.primary('❯ ') : '  ';
        const label = isSelected ? colors.secondary(opt.label) : colors.dim(opt.label);
        const desc = opt.description ? colors.dim(` - ${opt.description}`) : '';

        console.log(`${prefix}${label}${desc}`);
      });
    };

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.removeAllListeners('keypress');
      stdout.write('\x1B[?25h'); // Show cursor
    };

    // Initial render
    render();

    const onKeypress = (_chunk: unknown, key: readline.Key) => {
      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
        // Clear screen and re-render
        stdout.write('\x1B[2J\x1B[H');
        render();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
        // Clear screen and re-render
        stdout.write('\x1B[2J\x1B[H');
        render();
      } else if (key.name === 'return') {
        cleanup();
        console.log('');
        resolve(options[selectedIndex]!.value);
      } else if (key.name === 'escape' && config.cancelable) {
        cleanup();
        console.log('');
        resolve(null);
      } else if (key.ctrl && key.name === 'c') {
        cleanup();
        console.log('');
        process.exit(0);
      }
    };

    stdin.on('keypress', onKeypress);
  });
}

/**
 * Multi-select with keyboard
 */
export async function multiSelectWithKeyboard(
  question: string,
  options: SelectOption[],
  config: {
    defaultIndexes?: number[];
    cancelable?: boolean;
  } = {}
): Promise<string[] | null> {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const selectedItems = new Set<number>(config.defaultIndexes ?? []);
    const { stdin, stdout } = process;

    // Check if stdin is a TTY
    if (!stdin.isTTY) {
      // Fallback to simple prompt
      console.log(question);
      console.log('Enter comma-separated numbers (e.g., 1,3,5):');
      options.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt.label}`);
      });
      const rl = readline.createInterface({ input: stdin, output: stdout });
      rl.question('\nSelect options: ', (answer) => {
        rl.close();
        const indexes = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < options.length);
        resolve(indexes.map(i => options[i]!.value));
      });
      return;
    }

    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);

    const render = () => {
      stdout.write('\x1B[?25l');

      console.log('');
      console.log(colors.secondary(question));
      console.log(colors.dim('Use ↑↓ to navigate, Space to toggle, Enter to confirm' + (config.cancelable ? ', Esc to cancel' : '')));
      console.log('');

      options.forEach((opt, i) => {
        const isSelected = i === selectedIndex;
        const isChecked = selectedItems.has(i);
        const checkbox = isChecked ? colors.success('[✓]') : colors.dim('[ ]');
        const prefix = isSelected ? colors.brand.primary('❯ ') : '  ';
        const label = isSelected ? colors.secondary(opt.label) : colors.dim(opt.label);

        console.log(`${prefix}${checkbox} ${label}`);
      });
    };

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.removeAllListeners('keypress');
      stdout.write('\x1B[?25h');
    };

    render();

    const onKeypress = (_chunk: unknown, key: readline.Key) => {
      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
        stdout.write('\x1B[2J\x1B[H');
        render();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
        stdout.write('\x1B[2J\x1B[H');
        render();
      } else if (key.name === 'space') {
        if (selectedItems.has(selectedIndex)) {
          selectedItems.delete(selectedIndex);
        } else {
          selectedItems.add(selectedIndex);
        }
        stdout.write('\x1B[2J\x1B[H');
        render();
      } else if (key.name === 'return') {
        cleanup();
        console.log('');
        const selected = Array.from(selectedItems).map(i => options[i]!.value);
        resolve(selected);
      } else if (key.name === 'escape' && config.cancelable) {
        cleanup();
        console.log('');
        resolve(null);
      } else if (key.ctrl && key.name === 'c') {
        cleanup();
        console.log('');
        process.exit(0);
      }
    };

    stdin.on('keypress', onKeypress);
  });
}

/**
 * Auto-complete file paths
 */
export async function autocompleteFilePath(
  question: string,
  basePath: string = process.cwd()
): Promise<string> {
  // For now, simple readline input
  // TODO: Implement tab-completion with file system
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: (line: string) => {
      // TODO: Implement file path completion
      return [[], line];
    },
  });

  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || basePath);
    });
  });
}
