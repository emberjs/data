/**
 * Core Types, Type Utilties and Symbols for WarpDrive
 *
 * @module @warp-drive/core/types
 * @main @warp-drive/core/types
 */

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
 * @for @warp-drive/core/types
 * @param {ResourceSchema} schema
 * @return {ResourceSchema} the passed in schema
 * @public
 */

/**
 * A no-op type utility that enables type-checking object schema
 * definitions.
 *
 * Will return the passed in schema.
 *
 * @method objectSchema
 * @static
 * @for @warp-drive/core/types
 * @param {ObjectSchema} schema
 * @return {ObjectSchema} the passed in schema
 * @public
 */

/**
 * A type utility to narrow a schema to a ResourceSchema
 *
 * @method isResourceSchema
 * @static
 * @for @warp-drive/core/types
 * @param schema
 * @return {boolean}
 * @public
 */

/**
 * A type utility to narrow a schema to LegacyResourceSchema
 *
 * @method isLegacyResourceSchema
 * @static
 * @for @warp-drive/core/types
 * @param schema
 * @return {boolean}
 * @public
 */

export { resourceSchema, objectSchema, isResourceSchema, isLegacyResourceSchema } from '@warp-drive/core-types';
