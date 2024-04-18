/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, no-console */
import chalk from 'chalk';
import type { Options } from 'jscodeshift';

/**
 * A singleton logger to use in your codemod.
 *
 * Call `config` with the options from your codemod to configure the loggers.
 * Currently support options include:
 * - `verbose: '2'` to enable debug logging (this matches the `--verbose` flag in jscodeshift)
 */
class Logger {
  private static options: Options = {};
  private static loggers = new Map<string, Logger>();

  static config(options: Options): void {
    this.options = options;
  }

  static for(name: string): Logger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, new Logger(name));
    }
    return this.loggers.get(name)!;
  }

  constructor(public name: string) {}

  log(...args: any[]): void {
    console.log(new Date().getTime(), chalk.gray(this.name), chalk.magenta('[LOG]'), ...args);
  }

  success(...args: any[]): void {
    console.log(new Date().getTime(), chalk.gray(this.name), chalk.green('[SUCCESS]'), ...args);
  }

  error(...args: any[]): void {
    console.error(new Date().getTime(), chalk.gray(this.name), chalk.red('[ERROR]'), ...args);
  }

  warn(...args: any[]): void {
    console.warn(new Date().getTime(), chalk.gray(this.name), chalk.yellow('[WARN]'), ...args);
  }

  debug(...args: any[]): void {
    if (Logger.options.verbose === '2') {
      console.log(new Date().getTime(), chalk.gray(this.name), chalk.blue('[DEBUG]'), ...args);
    }
  }
}

export const logger = Logger;
