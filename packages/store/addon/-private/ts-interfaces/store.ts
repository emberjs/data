type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;

export interface FindOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string;
  adapterOptions?: Dict<unknown>;
  preload?: Dict<unknown>;
}
