type Dict<T> = import('./utils').Dict<T>;

export interface FindOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string;
  adapterOptions?: Dict<unknown>;
  preload?: Dict<unknown>;
}
