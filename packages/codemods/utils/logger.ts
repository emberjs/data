import chalk from 'chalk';
import type { Options } from 'jscodeshift';
import stripAnsi from 'strip-ansi';
import type { Logform, Logger as WinstonLogger } from 'winston';
import { createLogger as createWinstonLogger, format as winstonFormat, transports as winstonTransports } from 'winston';

const LogLevels = {
  levels: {
    error: 0,
    warn: 1,
    debug: 2,
    info: 3,
    success: 4,
  },
  colors: {
    error: 'red' as const,
    warn: 'yellow' as const,
    debug: 'blue' as const,
    info: 'magenta' as const,
    success: 'green' as const,
  },
};
type LogLevels = typeof LogLevels;

interface PrintInfo extends Logform.TransformableInfo {
  label: string;
  level: keyof LogLevels['levels'];
  message: unknown;
}

function formatMessageForConsole(message: unknown): string {
  if (typeof message === 'string') {
    return message.trim();
  }
  if (Array.isArray(message)) {
    return '\n\t' + message.map(formatMessageForFile).join('\n\t');
  }
  return Bun.inspect(message);
}

const formatForConsole = winstonFormat.printf((info: Logform.TransformableInfo) => {
  const { level, label, timestamp } = info as PrintInfo;
  return `${chalk.gray(timestamp)} [${label}] ${level}: ${formatMessageForConsole(info)}`;
});

function formatMessageForFile(message: unknown): string {
  if (typeof message === 'string') {
    return stripAnsi(message.trim());
  }
  if (Array.isArray(message)) {
    return '\n\t' + message.map(formatMessageForFile).join('\n\t');
  }
  return Bun.inspect(message);
}

const formatForFile = winstonFormat.printf((info: Logform.TransformableInfo) => {
  const { level, label, timestamp } = info as PrintInfo;
  return `${timestamp} [${label}] ${level}: ${formatMessageForFile(info)}`;
});

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

  /** Can't be private because we stub this in tests. Grimace face emoji. */
  _logger: WinstonLogger;

  constructor(public name: string) {
    if (Logger.options.logFile) {
      const filename = typeof Logger.options.logFile === 'string' ? Logger.options.logFile : 'ember-data-codemods.log';
      // eslint-disable-next-line no-console
      console.log('Logging to', filename);
      this._logger = createWinstonLogger({
        format: winstonFormat.combine(winstonFormat.label({ label: name }), winstonFormat.timestamp(), formatForFile),
        levels: LogLevels.levels,
        transports: [new winstonTransports.File({ filename, level: 'success' })],
      });
    } else {
      this._logger = createWinstonLogger({
        format: winstonFormat.combine(
          winstonFormat.label({ label: name }),
          winstonFormat.timestamp(),
          winstonFormat.colorize({ colors: LogLevels.colors, level: true, message: false }),
          formatForConsole
        ),
        levels: LogLevels.levels,
        transports: [new winstonTransports.Console()],
      });
    }
  }

  info(...args: unknown[]): void {
    this._logger.log('info', args);
  }

  success(...args: unknown[]): void {
    this._logger.log('success', args);
  }

  error(...args: unknown[]): void {
    this._logger.log('error', args);
  }

  warn(...args: unknown[]): void {
    this._logger.log('warn', args);
  }

  debug(...args: unknown[]): void {
    if (Logger.options.verbose === '2') {
      this._logger.log('debug', args);
    }
  }
}

export const logger = Logger;
