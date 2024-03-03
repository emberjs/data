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
