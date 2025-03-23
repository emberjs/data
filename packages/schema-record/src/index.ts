/**
 * This package provides reactive capabilities for your resource data.
 * It works together with a [*Warp***Drive**](https://github.com/emberjs/data/)
 * [Cache](../classes/<Interface>%20Cache)
 * and associated Schemas to simplify the most complex parts of your
 * app's state management.
 *
 * @module @warp-drive/schema-record
 * @main @warp-drive/schema-record
 */
export { instantiateRecord, teardownRecord } from './-private/hooks';
export { type Transformation, SchemaService, withDefaults, fromIdentity, registerDerivations } from './-private/schema';
export { type SchemaRecord } from './-private/record';
export { Checkout } from './-private/symbols';
