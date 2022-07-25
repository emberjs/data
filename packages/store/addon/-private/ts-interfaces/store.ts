import type { Dict } from './utils';

export interface FindOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string;
  adapterOptions?: Dict<unknown>;
  preload?: Dict<unknown>;
}
