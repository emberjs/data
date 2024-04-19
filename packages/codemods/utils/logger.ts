/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, no-console */
import chalk from 'chalk';
import type { Options } from 'jscodeshift';

type ConsoleMethod = 'log' | 'error' | 'warn' | 'debug' | 'info';

const TagsByLogLevel = {
  log: chalk.magenta('[LOG]'),
  success: chalk.green('[SUCCESS]'),
  error: chalk.red('[ERROR]'),
  warn: chalk.yellow('[WARN]'),
  debug: chalk.blue('[DEBUG]'),
};
type TagsByLogLevel = typeof TagsByLogLevel;

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
    this._log('log', 'log', ...args);
  }

  success(...args: any[]): void {
    this._log('log', 'success', ...args);
  }

  error(...args: any[]): void {
    this._log('error', 'error', ...args);
  }

  warn(...args: any[]): void {
    console.log(args);
    this._log('warn', 'warn', ...args);
  }

  debug(...args: any[]): void {
    if (Logger.options.verbose === '2') {
      this._log('debug', 'debug', ...args);
    }
  }

  /** Can't be private because we stub this in tests. Grimace face emoji. */
  _log<M extends ConsoleMethod>(method: M, level: keyof TagsByLogLevel, ...args: Parameters<Console[M]>): void {
    return console[method](new Date().getTime(), chalk.gray(this.name), TagsByLogLevel[level], ...args);
  }
}

export const logger = Logger;
