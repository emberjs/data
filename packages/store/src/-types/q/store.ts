export interface FindOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string;
  adapterOptions?: Record<string, unknown>;
  preload?: Record<string, unknown>;
}
