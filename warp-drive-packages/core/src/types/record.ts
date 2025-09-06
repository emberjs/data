import type { Type } from './symbols.ts';

/**
 * Records may be anything, They don't even
 * have to be objects.
 *
 * Whatever they are, if they have a Type
 * property, that property will be used by WarpDrive
 * and WarpDrive to provide better type safety and
 * intellisense.
 *
 * @class TypedRecordInstance
 */
export interface TypedRecordInstance {
  /**
   * The type of the resource.
   *
   * This is an optional feature that can be used by
   * record implementations to provide a typescript
   * hint for the type of the resource.
   *
   * When used, WarpDrive APIs can
   * take advantage of this to provide better type
   * safety and intellisense.
   *
   * @property [Type]
   * @type {Type}
   * @type {String}
   */
  [Type]: string;
}

/**
 * A type utility that extracts the Type if available,
 * otherwise it returns never.
 *
 */
export type TypeFromInstance<T> = T extends TypedRecordInstance ? T[typeof Type] : never;

/**
 * A type utility that extracts the Type if available,
 * otherwise it returns string
 *
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

/**
 * A utility that takes two types, K and T, and produces a new type that is a "mask" of T based on K.
 *
 * That's a mouthful, so let's break it down:
 *
 * Let's say you have a User type and an Address type.
 *
 * ```ts
 * interface Address {
 *   street: string;
 *   city: string;
 *   state: string;
 *   zip: string;
 * }
 *
 * interface User {
 *   name: string;
 *   title: string;
 *   address: Address;
 * }
 * ```
 *
 * Now, imagine you want to load a preview of the user with some information about their address,
 * but you don't want to load the entire user or address. You probably want to still ensure
 * the type of the data you do load matches the underlying Address and User types, but doesn't
 * include everything.
 *
 * If you did this manually, you might do something like this:
 *
 * ```ts
 * interface UserPreview {
 *   name: string;
 *   address: AddressPreview;
 * }
 *
 * interface AddressPreview {
 *   city: string;
 * }
 * ```
 *
 * From a TypeScript performance perspective, this is the best way to approach these preview
 * types, but this is also tedious and error-prone, especially if the User or Address types change.
 *
 * For Address, we could create a validated type using `Pick`:
 *
 * ```ts
 * type AddressPreview = Pick<Address, 'city'>;
 * ```
 *
 * This ensures that if the Address type changes, our AddressPreview will still be valid.
 * However, for UserPreview, we can't just use `Pick` because the `address` property is of type `Address`,
 * not `AddressPreview`. This is where the `Mask` type comes in.
 *
 * With `Mask`, we define the `UserPreview` in two parts
 * - first, we define the subset of fields we want to include from `User`, using `Pick` or an interface.
 * - then, we use `Mask` to replace the related types of fields like Address with their more limited subset.
 *
 * Here's how we can do it:
 *
 * ```ts
 * // First, we define the base of UserPreview with Pick
 * type UserPreviewBase = Pick<User, 'name' | 'address'>;
 * // Then, we use Mask to replace Address with AddressPreview
 * type UserPreview = Mask<{ address: AddressPreview }, UserPreviewBase>;
 * ```
 *
 * Now, `UserPreview` will have the `name` field from `User` and the `address` field will be of type `AddressPreview`.
 * This way, if the `User` or `Address` types change, TypeScript will ensure that our `UserPreview` and `AddressPreview`
 * types remain valid and consistent with the underlying types.
 *
 * But what if your app has data with massive interfaces such that the TypeScript performance of this
 * approach becomes a problem? In that case, see {@link Validate}
 */
export type Mask<K extends object, T extends K> = {
  [P in keyof T]: P extends keyof K ? (T[P] extends K[P] ? K[P] : never) : T[P];
};

/**
 * A utility that takes two types, K and T, and ensures that K is a valid subset of T.
 *
 * That's a mouthful, so let's break it down:
 *
 * Let's say you have a User type and an Address type.
 *
 * ```ts
 * interface Address {
 *   street: string;
 *   city: string;
 *   state: string;
 *   zip: string;
 * }
 *
 * interface User {
 *   name: string;
 *   title: string;
 *   address: Address;
 * }
 * ```
 *
 * Now, imagine you want to load a preview of the user with some information about their address,
 * but you don't want to load the entire user or address. You probably want to still ensure
 * the type of the data you do load matches the underlying Address and User types, but doesn't
 * include everything.
 *
 * You might do something like this:
 *
 * ```ts
 * interface UserPreview {
 *   name: string;
 *   address: AddressPreview;
 * }
 *
 * interface AddressPreview {
 *   city: string;
 * }
 * ```
 *
 * From a TypeScript performance perspective, this is the best way to approach these preview
 * types, but this is also error-prone, especially if the User or Address types change.
 *
 * Validate can help ensure that your preview types remain valid.
 *
 * ```ts
 * type IsValidUserPreview = Validate<UserPreview, User>; // This will be valid
 * ```
 *
 * For help creating subsets of types, see {@link Mask}
 */
export type Validate<K extends object, T extends K> = T extends K ? K : never;
