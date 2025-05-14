import type { Value } from '@warp-drive/core-types/json/raw';
import type { Includes, TypedRecordInstance } from '@warp-drive/core-types/record';

export interface BaseFinderOptions<T = unknown> {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
  adapterOptions?: Record<string, unknown>;
}
export interface FindRecordOptions<T = unknown> extends BaseFinderOptions<T> {
  /**
   * Data to preload into the store before the request is made.
   * This feature is *highly* discouraged and has no corresponding
   * feature when using builders and handlers.
   *
   * Excepting relationships: the data should be in the form of a
   * JSON object where the keys are fields on the record and the value
   * is the raw value to be added to the cache.
   *
   * Relationships can either be provided as string IDs from which
   * an identifier will be built base upon the relationship's expected
   * resource type, or be record instances from which the identifier
   * will be extracted.
   *
   */
  preload?: Record<string, Value>;
}

export type QueryOptions = {
  [K in string | 'adapterOptions']?: K extends 'adapterOptions' ? Record<string, unknown> : unknown;
};

export type FindAllOptions<T = unknown> = BaseFinderOptions<T>;
export type LegacyResourceQuery<T = unknown> = {
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
  [key: string]: Value | undefined;
};
