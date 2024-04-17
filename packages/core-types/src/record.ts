/*
 * @module @warp-drive/core-types
 */
import type { ResourceType } from './symbols';

/**
 * Records may be anything, They don't even
 * have to be objects.
 *
 * Whatever they are, if they have a ResourceType
 * property, that property will be used by EmberData
 * and WarpDrive to provide better type safety and
 * intellisense.
 *
 * @class TypedRecordInstance
 * @typedoc
 */
export interface TypedRecordInstance {
  /**
   * The type of the resource.
   *
   * This is an optional feature that can be used by
   * record implementations to provide a typescript
   * hint for the type of the resource.
   *
   * When used, EmberData and WarpDrive APIs can
   * take advantage of this to provide better type
   * safety and intellisense.
   *
   * @property {ResourceType} [ResourceType]
   * @type {string}
   * @typedoc
   */
  [ResourceType]: string;
}

/**
 * A type utility that extracts the ResourceType if available,
 * otherwise it returns never.
 *
 * @typedoc
 */
export type TypeFromInstance<T> = T extends TypedRecordInstance ? T[typeof ResourceType] : never;

/**
 * A type utility that extracts the ResourceType if available,
 * otherwise it returns string
 *
 * @typedoc
 */
export type TypeFromInstanceOrString<T> = T extends TypedRecordInstance ? T[typeof ResourceType] : string;

type Unpacked<T> = T extends (infer U)[] ? U : T;
type NONE = { __NONE: never };

type __InternalExtract<
  T extends TypedRecordInstance,
  V extends TypedRecordInstance,
  IncludePrefix extends boolean,
  Ignore,
  Pre extends string,
> =
  // if we extend T, we return the leaf value
  V extends T
    ? IncludePrefix extends false
      ? V[typeof ResourceType]
      : Pre
    : // else if we are in Ignore we add the lead and exit
      V extends Ignore
      ? IncludePrefix extends false
        ? V[typeof ResourceType]
        : Pre
      : // else add T to Ignore and recurse
        ExtractUnion<V, IncludePrefix, Ignore | T, Pre>;

type __ExtractIfRecord<
  T extends TypedRecordInstance,
  V,
  IncludePrefix extends boolean,
  Ignore,
  Pre extends string,
> = V extends TypedRecordInstance ? __InternalExtract<T, V, IncludePrefix, Ignore, Pre> : never;

type _ExtractUnion<T extends TypedRecordInstance, IncludePrefix extends boolean, Ignore, Pre> = {
  // for each string key in the record,
  [K in keyof T]: K extends string
    ? // we recursively extract any values that resolve to a TypedRecordInstance
      __ExtractIfRecord<T, Unpacked<Awaited<T[K]>>, IncludePrefix, Ignore, Pre extends string ? `${Pre}.${K}` : K>
    : never;
  // then we return any value that is not 'never'
}[keyof T];

/**
 * A Utility that extracts either resource types or resource paths from a TypedRecordInstance.
 *
 * Its limitations are mostly around its intentional non-recursiveness. It presumes that APIs which
 * implement includes will not allow cyclical include paths, and will collapse includes by type.
 *
 * This follows closer to the JSON:API fields spec than to the includes spec in nature, but in
 * practice it is so impracticle for an API to allow z-algo include paths that this is probably
 * reasonable.
 *
 * We may need to revisit this in the future, opting to either make this restriction optional or
 * to allow for other strategies.
 *
 * There's a 90% chance this particular implementation belongs being in the JSON:API package instead
 * of core-types, but it's here for now.
 *
 * @typedoc
 */
type ExtractUnion<
  T extends TypedRecordInstance,
  IncludePrefix extends boolean = false,
  Ignore = NONE,
  Pre = NONE,
> = Exclude<
  IncludePrefix extends true
    ? // if we want to include prefix, we union with the prefix. Outer Exclude will filter any "NONE" types
      _ExtractUnion<T, IncludePrefix, Ignore, Pre> | Pre
    : // Else we just union the types.
      _ExtractUnion<T, IncludePrefix, Ignore, Pre> | T[typeof ResourceType],
  NONE
>;

/**
 * A utility that provides the union of all ResourceName for all potential
 * includes for the given TypedRecordInstance.
 *
 * @typedoc
 */
export type ExtractSuggestedCacheTypes<T extends TypedRecordInstance> = ExtractUnion<T>; // ToPaths<ExpandIgnore<T, true>, false>;

/**
 * A utility that provides the union type of all valid include paths for the given
 * TypedRecordInstance.
 *
 * Cyclical paths are filtered out.
 *
 * @typedoc
 */
export type Includes<T extends TypedRecordInstance> = ExtractUnion<T, true>; // ToPaths<ExpandIgnore<T>>;
