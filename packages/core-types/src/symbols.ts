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
