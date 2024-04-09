/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, no-console */
import type { Options } from 'jscodeshift';

class Logger {
  private options: Options = {};

  config(options: Options): void {
    this.options = options;
  }

  warn(...args: any[]): void {
    console.log('[WARN]', ...args);
  }

  debug(...args: any[]): void {
    if (this.options.verbose === '2') {
      console.log('[DEBUG]', ...args);
    }
  }
}

export const logger = new Logger();
