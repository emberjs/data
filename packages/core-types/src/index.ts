import type { LegacyResourceSchema, ObjectSchema, ResourceSchema } from './schema/fields';

/**
 * This package provides core types, type-utilities, symbols
 * and constants used across the WarpDrive ecosystem.
 *
 * @module @warp-drive/core-types
 * @main @warp-drive/core-types
 */
export type { StableRecordIdentifier } from './identifier';

/**
 * A no-op type utility that enables type-checking resource schema
 * definitions.
 *
 * Will return the passed in schema.
 *
 * This will not validate relationship inverses or related types,
 * as doing so would require a full schema graph to be passed in
 * and no cycles in the graph to be present.
 *
 * @method resourceSchema
 * @static
 * @for @warp-drive/core-types
 * @param {ResourceSchema} schema
 * @return {ResourceSchema} the passed in schema
 * @public
 */
export function resourceSchema<T extends ResourceSchema>(schema: T): T {
  return schema;
}

/**
 * A no-op type utility that enables type-checking object schema
 * definitions.
 *
 * Will return the passed in schema.
 *
 * @method objectSchema
 * @static
 * @for @warp-drive/core-types
 * @param {ObjectSchema} schema
 * @return {ObjectSchema} the passed in schema
 * @public
 */
export function objectSchema<T extends ObjectSchema>(schema: T): T {
  return schema;
}

/**
 * A type utility to narrow a schema to a ResourceSchema
 *
 * @method isResourceSchema
 * @static
 * @for @warp-drive/core-types
 * @param schema
 * @return {boolean}
 * @public
 */
export function isResourceSchema(schema: ResourceSchema | ObjectSchema): schema is ResourceSchema {
  return schema?.identity?.kind === '@id';
}

/**
 * A type utility to narrow a schema to LegacyResourceSchema
 *
 * @method isLegacyResourceSchema
 * @static
 * @for @warp-drive/core-types
 * @param schema
 * @return {boolean}
 * @public
 */
export function isLegacyResourceSchema(schema: ResourceSchema | ObjectSchema): schema is LegacyResourceSchema {
  return isResourceSchema(schema) && schema.legacy === true;
}
