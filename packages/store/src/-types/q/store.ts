import type { Value } from '@warp-drive/core-types/json/raw';

export interface FindOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string;
  adapterOptions?: Record<string, unknown>;
  preload?: Record<string, Value>;
}

export interface QueryOptions {
  adapterOptions?: Record<string | number | symbol, unknown>;
}
