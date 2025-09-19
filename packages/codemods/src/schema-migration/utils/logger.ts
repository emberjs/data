/**
 * Simple logging utility for schema migration CLI
 */

export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(message, ...args);
  }
}