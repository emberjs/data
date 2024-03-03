import type { Value } from '@warp-drive/core-types/json/raw';

export interface BaseFinderOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string | string[];
  adapterOptions?: Record<string, unknown>;
}
export interface FindRecordOptions extends BaseFinderOptions {
  preload?: Record<string, Value>;
}

export type QueryOptions = {
  [K in string | 'adapterOptions']?: K extends 'adapterOptions' ? Record<string, unknown> : unknown;
};

export type FindAllOptions = BaseFinderOptions;
