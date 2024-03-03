import type { Value } from '@warp-drive/core-types/json/raw';

export interface FindRecordOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string | string[];
  adapterOptions?: Record<string, unknown>;
  preload?: Record<string, Value>;
}

export type QueryOptions = {
  [K in string | 'adapterOptions']?: K extends 'adapterOptions' ? Record<string, unknown> : unknown;
};

export type FindAllOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  adapterOptions?: Record<string, unknown>;
  include?: string | string[];
};
