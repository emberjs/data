import type { Type } from './symbols';

/**
 * Records may be anything, They don't even
 * have to be objects.
 *
 * Whatever they are, if they have a Type
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
   * @property [Type]
   * @type {Type}
   * @type {String}
   * @typedoc
   */
  [Type]: string;
}

/**
 * A type utility that extracts the Type if available,
 * otherwise it returns never.
 *
 * @typedoc
 */
export type TypeFromInstance<T> = T extends TypedRecordInstance ? T[typeof Type] : never;

/**
 * A type utility that extracts the Type if available,
 * otherwise it returns string
 *
 * @typedoc
 */
export type TypeFromInstanceOrString<T> = T extends TypedRecordInstance ? T[typeof Type] : string;

type IsUniqueSymbol<T> = T extends `___(unique) Symbol(${string})` ? true : false;
type Unpacked<T> = T extends (infer U)[] ? U : T;
type NONE = { __NONE: never };

type __InternalExtract<
  MAX_DEPTH extends _DEPTHCOUNT,
  T extends TypedRecordInstance,
  V extends TypedRecordInstance,
  IncludePrefix extends boolean,
  Ignore,
  Pre extends string,
  DEPTH extends _DEPTHCOUNT,
> =
  // if we extend T, we return the leaf value
  V extends T
    ? IncludePrefix extends false
      ? V[typeof Type]
      : Pre
    : // else if we are in Ignore we add the lead and exit
      V extends Ignore
      ? IncludePrefix extends false
        ? V[typeof Type]
        : Pre
      : // else if we are at max depth, we return never
        IS_MAX_DEPTH<DEPTH, MAX_DEPTH> extends true
        ? Pre
        : // else add T to Ignore and recurse
          ExtractUnion<MAX_DEPTH, V, IncludePrefix, Ignore | T, Pre, INC_DEPTH<DEPTH>>;

type __ExtractIfRecord<
  MAX_DEPTH extends _DEPTHCOUNT,
  T extends TypedRecordInstance,
  V,
  IncludePrefix extends boolean,
  Ignore,
  Pre extends string,
  DEPTH extends _DEPTHCOUNT,
> = V extends TypedRecordInstance ? __InternalExtract<MAX_DEPTH, T, V, IncludePrefix, Ignore, Pre, DEPTH> : never;

type _ExtractUnion<
  MAX_DEPTH extends _DEPTHCOUNT,
  T extends TypedRecordInstance,
  IncludePrefix extends boolean,
  Ignore,
  Pre,
  DEPTH extends _DEPTHCOUNT,
> = {
  // for each string key in the record,
  [K in keyof T]: IsUniqueSymbol<K> extends true
    ? never
    : K extends string
      ? // we recursively extract any values that resolve to a TypedRecordInstance
        __ExtractIfRecord<
          MAX_DEPTH,
          T,
          Unpacked<Awaited<T[K]>>,
          IncludePrefix,
          Ignore,
          Pre extends string ? `${Pre}.${K}` : K,
          DEPTH
        >
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
  MAX_DEPTH extends _DEPTHCOUNT,
  T extends TypedRecordInstance,
  IncludePrefix extends boolean = false,
  Ignore = NONE,
  Pre = NONE,
  DEPTH extends _DEPTHCOUNT = 1,
> = Exclude<
  IncludePrefix extends true
    ? // if we want to include prefix, we union with the prefix. Outer Exclude will filter any "NONE" types
      _ExtractUnion<MAX_DEPTH, T, IncludePrefix, Ignore, Pre, DEPTH> | Pre
    : // Else we just union the types.
      _ExtractUnion<MAX_DEPTH, T, IncludePrefix, Ignore, Pre, DEPTH> | T[typeof Type],
  NONE
>;

type _DEPTHCOUNT = 1 | 2 | 3 | 4 | 5;
type INC_DEPTH<START extends _DEPTHCOUNT> = START extends 1 ? 2 : START extends 2 ? 3 : START extends 3 ? 4 : 5;
type IS_MAX_DEPTH<
  DEPTH extends _DEPTHCOUNT,
  MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH,
> = DEPTH extends MAX_DEPTH ? true : false;
type DEFAULT_MAX_DEPTH = 3;
/**
 * A utility that provides the union of all ResourceName for all potential
 * includes for the given TypedRecordInstance.
 *
 * @typedoc
 */
export type ExtractSuggestedCacheTypes<
  T extends TypedRecordInstance,
  MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH,
> = ExtractUnion<MAX_DEPTH, T>; // ToPaths<ExpandIgnore<T, true>, false>;

/**
 * A utility that provides the union type of all valid include paths for the given
 * TypedRecordInstance.
 *
 * Cyclical paths are filtered out.
 *
 * @typedoc
 */
export type Includes<T extends TypedRecordInstance, MAX_DEPTH extends _DEPTHCOUNT = DEFAULT_MAX_DEPTH> = ExtractUnion<
  MAX_DEPTH,
  T,
  true
>;

export type OpaqueRecordInstance = unknown;

export type _StringSatisfiesIncludes<T extends string, SET extends string, FT extends string> = T extends SET
  ? FT
  : T extends `${infer U},${infer V}`
    ? U extends SET
      ? _StringSatisfiesIncludes<V, Exclude<SET, U>, FT>
      : never
    : never;

export type StringSatisfiesIncludes<T extends string, SET extends string> = _StringSatisfiesIncludes<T, SET, T>;

export function createIncludeValidator<T extends TypedRecordInstance>() {
  return function validateIncludes<U extends string>(includes: StringSatisfiesIncludes<U, Includes<T>>): U {
    return includes;
  };
}
