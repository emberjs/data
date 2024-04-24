import type { LoggerOptions } from 'winston';

export interface Options extends LoggerOptions {
  dry: boolean;
  ignore?: string[];
}
