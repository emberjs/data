import type { LoggerOptions } from '../../utils/logger.js';

export interface SharedCodemodOptions extends LoggerOptions {
  dry?: boolean;
  ignore?: string[];
}
