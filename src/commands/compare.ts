/**
 * Compare command - Compare responses from multiple models
 */

import { OllamaClient } from '../api/client.js';
import { getEffectiveConfig } from '../config/index.js';
import { displayError } from '../ui/display.js';
import { colors, gradients } from '../ui/colors.js';
import { highlightText } from '../ui/syntax.js';

export interface CompareOptions {
  models?: string;
  system?: string;
}

/**
 * Compare responses from multiple models
 */
export async function compareCommand(prompt: string, options: CompareOptions): Promise<void> {
  try {
    const config = await getEffectiveConfig();

    // Parse models
    const modelList = options.models
      ? options.models.split(',').map((m) => m.trim())
      : [config.defaultModel, 'llama3.1', 'mistral'];

    if (modelList.length < 2) {
      displayError('Please specify at least 2 models using --models');
      return;
    }

    console.log('');
    console.log(gradients.brand('Model Comparison'));
    console.log('');
    console.log(colors.secondary(`Prompt: ${colors.brand.primary(prompt)}`));
    console.log(colors.dim(`Models: ${modelList.join(', ')}`));
    console.log('');

    const results: { model: string; response: string; time: number }[] = [];

    // Execute in parallel
    await Promise.all(
      modelList.map(async (model) => {
        const startTime = Date.now();
        const client = new OllamaClient(config.baseUrl);

        try {
          console.log(colors.tertiary(`⏳ ${model}: Generating...`));

          let fullResponse = '';
          const messages = options.system
            ? [
                { role: 'system' as const, content: options.system },
                { role: 'user' as const, content: prompt },
              ]
            : [{ role: 'user' as const, content: prompt }];

          for await (const chunk of client.chat({ model, messages })) {
            fullResponse += chunk;
          }

          const elapsed = Date.now() - startTime;
          results.push({ model, response: fullResponse, time: elapsed });

          console.log(colors.success(`✓ ${model}: Done (${elapsed}ms)`));
        } catch (error) {
          console.log(colors.error(`✗ ${model}: Failed`));
          results.push({
            model,
            response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            time: Date.now() - startTime,
          });
        }
      })
    );

    // Display results
    console.log('');
    console.log(gradients.brand('Results'));
    console.log('');

    // Sort by original order
    const sortedResults = results.sort(
      (a, b) => modelList.indexOf(a.model) - modelList.indexOf(b.model)
    );

    for (const result of sortedResults) {
      console.log(colors.secondary(`╭─ 🤖 ${result.model} (${result.time}ms)`));
      console.log(colors.dim('│'));

      // Apply syntax highlighting to the response
      const highlighted = highlightText(result.response);

      // Split response into lines and prefix with │
      const lines = highlighted.split('\n');
      for (const line of lines) {
        console.log(colors.dim('│ ') + line);
      }

      console.log(colors.dim('╰─'));
      console.log('');
    }

    // Summary
    const avgTime = Math.round(results.reduce((sum, r) => sum + r.time, 0) / results.length);
    const fastest = results.reduce((min, r) => (r.time < min.time ? r : min));
    const longest = results.reduce((max, r) =>
      r.response.length > max.response.length ? r : max
    );

    console.log(colors.secondary('Summary:'));
    console.log(
      `  ${colors.tertiary(`Average time: ${avgTime}ms | Fastest: ${fastest.model} (${fastest.time}ms)`)}`
    );
    console.log(`  ${colors.tertiary(`Longest response: ${longest.model}`)}`);
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to compare models');
  }
}
