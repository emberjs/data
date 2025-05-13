import assert from 'assert';
import chalk from 'chalk';
import type { Options, SourceLocation } from 'jscodeshift';
import stripAnsi from 'strip-ansi';
import type { Logform, Logger as WinstonLogger } from 'winston';
import { createLogger as createWinstonLogger, format as winstonFormat, transports as winstonTransports } from 'winston';

import { isRecord } from './types.js';

export interface LoggerOptions extends Options {
  verbose?: '0' | '1' | '2';
  logFile?: string | boolean;
}

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

function formatMessage(raw: unknown, sanitize = (message: string) => message): string {
  if (typeof raw === 'string') {
    return sanitize(raw.trim());
  }
  if (Array.isArray(raw)) {
    return raw.map((m) => formatMessage(m, sanitize)).join(' ');
  }
  if (isRecord(raw) && !(raw instanceof Error)) {
    let message = '';
    if (typeof raw['filepath'] === 'string') {
      let location = `${raw['filepath']}`;
      delete raw['filepath'];
      if ('loc' in raw && isRecord(raw['loc'])) {
        const loc = raw.loc as unknown as SourceLocation;
        location += `:${loc.start.line}:${loc.start.column}`;
        delete raw['loc'];
      }
      message += `at ${location}`;
    }
    if ('message' in raw) {
      message += `\n\t${formatMessage(raw['message'], sanitize)}`;
      delete raw['message'];
    }
    if (message.length) {
      if (Object.entries(raw).length) {
        message += `\n${Bun.inspect(raw)}`;
      }
      return message;
    }
  }
  return Bun.inspect(raw);
}

const formatForConsole = winstonFormat.printf((info: Logform.TransformableInfo) => {
  const { level, label, timestamp } = info as PrintInfo;
  return `${chalk.gray(timestamp)} [${label}] ${level}: ${formatMessage(info)}`;
});

const formatForFile = winstonFormat.printf((info: Logform.TransformableInfo) => {
  const { level, label, timestamp } = info as PrintInfo;
  assert(typeof timestamp === 'string', `Expected timestamp value to be a string. Instead was ${typeof timestamp}`);
  return `${timestamp} [${label}] ${level}: ${formatMessage(info, stripAnsi)}`;
});

/**
 * A singleton logger to use in your codemod.
 *
 * Call `config` with the options from your codemod to configure the loggers.
 * Currently support options include:
 * - `verbose: '2'` to enable debug logging (this matches the `--verbose` flag in jscodeshift)
 */
class Logger {
  private static options: LoggerOptions = {};
  private static loggers = new Map<string, Logger>();
  public name: string;

  static config(options: LoggerOptions): void {
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

  constructor(name: string) {
    this.name = name;
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
