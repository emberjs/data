import chalk from 'chalk';
import * as readline from 'readline/promises';

export async function confirmStrategy() {
  return confirm({
    prompt: chalk.white(`\nDo you want to continue with this strategy?`),
    cancelled: chalk.red('🚫 Strategy not confirmed. Exiting...'),
  });
}

/**
 * Prompt user to continue, exit if not confirmed.
 *
 * In CI environments, this function will return immediately without prompting.
 *
 * config.prompt - The prompt to display to the user
 * config.cancelled - The message to display if the user cancels
 *
 * yes/no prompt will be added to the end of the prompt text automatically.
 *
 * @internal
 */
export async function confirm(config: { prompt: string; cancelled: string }): Promise<void> {
  if (process.env.CI) {
    return;
  }
  const confirm = await question(`${config.prompt} ${chalk.yellow(`[y/n]`)}: `);
  const input = confirm.trim().toLowerCase();
  if (input !== 'y' && input !== 'yes') {
    console.log(config.cancelled);
    process.exit(1);
  }
}

export async function question(prompt: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return rl.question(prompt);
}
