import type { TypedRecordInstance } from '@warp-drive/core-types/record';
import type { ResourceType } from '@warp-drive/core-types/symbols';

import type { RelatedCollection } from './many-array';
import type { Model } from './model';
import type { PromiseBelongsTo } from './promise-belongs-to';
import type { PromiseManyArray } from './promise-many-array';

type ExcludeNull<T> = Exclude<T, null> extends never ? T : Exclude<T, null>;
type GetMappedKey<M, V> = { [K in keyof M]-?: ExcludeNull<M[K]> extends V ? K : never }[keyof M] & string;

/**
 * Get the keys of fields that are maybe defined as `belongsTo` relationships
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like relationships, but are not.
 *
 * @typedoc
 */
export type MaybeBelongsToFields<ThisType> =
  _TrueKeys<ThisType> extends never ? string : _MaybeBelongsToFields<ThisType>;
type _MaybeBelongsToFields<ThisType> = GetMappedKey<ThisType, PromiseBelongsTo | TypedRecordInstance>;

/**
 * Get the keys of fields that are maybe defined as `hasMany` relationships
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like relationships, but are not.
 *
 * @typedoc
 */
export type MaybeHasManyFields<ThisType> = _TrueKeys<ThisType> extends never ? string : _MaybeHasManyFields<ThisType>;
type _MaybeHasManyFields<ThisType> = GetMappedKey<ThisType, RelatedCollection | PromiseManyArray>;

/**
 * Get the keys of fields that are maybe defined as `attr` fields
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like attributes, but are not.
 *
 * This is computed by excluding the keys that are defined as `belongsTo` or `hasMany`
 * as well as the keys on EmberObject and the Model base class
 *
 * @typedoc
 */
export type MaybeAttrFields<ThisType> =
  _TrueKeys<ThisType> extends never
    ? string
    : Exclude<_TrueKeys<ThisType>, _MaybeBelongsToFields<ThisType> | _MaybeHasManyFields<ThisType>>;

/**
 * Get the keys of fields that are maybe defined as relationships
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like relationships, but are not.
 *
 * @typedoc
 */
export type MaybeRelationshipFields<ThisType> =
  _TrueKeys<ThisType> extends never ? string : _MaybeBelongsToFields<ThisType> | _MaybeHasManyFields<ThisType>;

type _TrueKeys<ThisType> = Exclude<keyof ThisType & string, (keyof Model & string) | typeof ResourceType>;

/**
 * Get the keys of all fields defined on the given subclass of Model
 * that don't exist on EmberObject or Model.
 */
export type SubclassKeys<ThisType> = _TrueKeys<ThisType> extends never ? string : _TrueKeys<ThisType>;
