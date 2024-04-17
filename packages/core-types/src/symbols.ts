/*
 * @module @warp-drive/core-types
 */
export const RecordStore = Symbol('Store');

/**
 * Symbol for the type of a resource.
 *
 * This is an optional feature that can be used by
 * record implementations to provide a typescript
 * hint for the type of the resource.
 *
 * When used, EmberData and WarpDrive APIs can
 * take advantage of this to provide better type
 * safety and intellisense.
 *
 * @type {Symbol}
 * @typedoc
 */
export const ResourceType = Symbol('$type');

/**
 * Symbol for the name of a transform.
 *
 * This is an optional feature that can be used by
 * transform implementations to provide a typescript
 * hint for the name of the transform.
 *
 * If not used, `attr<Transform>('name')` will
 * allow any string name. `attr('name')` will always
 * allow any string name.
 *
 * If used, `attr<Transform>('name')` will enforce
 * that the name is the same as the transform name.
 *
 * @type {Symbol}
 * @typedoc
 */
export const TransformName = Symbol('$TransformName');

/**
 * Symbol for use by builders to indicate the return type
 * generic to use for store.request()
 *
 * @type {Symbol}
 * @typedoc
 */
export const RequestSignature = Symbol('RequestSignature');
