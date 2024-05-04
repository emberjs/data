import type { SharedCodemodOptions } from '../utils/options.js';
import type { LegacyStoreMethod } from './config.js';

export interface Options extends SharedCodemodOptions {
  storeNames: string[];
  methods?: LegacyStoreMethod[];
}
