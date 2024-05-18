import type { TypedRecordInstance } from '@warp-drive/core-types/record';
import type { ResourceType } from '@warp-drive/core-types/symbols';

import type { RelatedCollection } from './many-array';
import type { Model } from './model';
import type { PromiseBelongsTo } from './promise-belongs-to';
import type { PromiseManyArray } from './promise-many-array';

type GetMappedKey<M, V> = { [K in keyof M]-?: M[K] extends V ? K : never }[keyof M] & string;

/**
 * Get the keys of fields that are maybe defined as `belongsTo` relationships
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like relationships, but are not.
 *
 * @typedoc
 */
export type MaybeBelongsToFields<ThisType extends Model> = GetMappedKey<
  ThisType,
  PromiseBelongsTo | TypedRecordInstance
>;

/**
 * Get the keys of fields that are maybe defined as `hasMany` relationships
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like relationships, but are not.
 *
 * @typedoc
 */
export type MaybeHasManyFields<ThisType extends Model> = GetMappedKey<ThisType, RelatedCollection | PromiseManyArray>;

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
export type MaybeAttrFields<ThisType extends Model> =
  _TrueKeys<ThisType> extends never
    ? string
    : Exclude<_TrueKeys<ThisType>, MaybeBelongsToFields<ThisType> | MaybeHasManyFields<ThisType>>;

/**
 * Get the keys of fields that are maybe defined as relationships
 *
 * "Maybe" because getter/computed fields might be returning values that look
 * like relationships, but are not.
 *
 * @typedoc
 */
export type MaybeRelationshipFields<ThisType extends Model> =
  _TrueKeys<ThisType> extends never ? string : MaybeBelongsToFields<ThisType> | MaybeHasManyFields<ThisType>;

type _TrueKeys<ThisType extends Model> = Exclude<keyof ThisType & string, (keyof Model & string) | typeof ResourceType>;

/**
 * Get the keys of all fields defined on the given subclass of Model
 * that don't exist on EmberObject or Model.
 */
export type SubclassKeys<ThisType extends Model> = _TrueKeys<ThisType> extends never ? string : _TrueKeys<ThisType>;
