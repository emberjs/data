import chalk from 'chalk';
import * as readline from 'readline/promises';

export async function confirmStrategy() {
  if (process.env.CI) {
    return;
  }
  const confirm = await question(
    chalk.white(`\nDo you want to continue with this strategy? ${chalk.yellow(`[y/n]`)}: `)
  );
  const input = confirm.trim().toLowerCase();
  if (input !== 'y' && input !== 'yes') {
    console.log(chalk.red('🚫 Strategy not confirmed. Exiting...'));
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
