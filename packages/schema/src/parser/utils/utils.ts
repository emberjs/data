import chalk from 'chalk';

export function write($text: string) {
  process.stdout.write(chalk.gray($text));
}
