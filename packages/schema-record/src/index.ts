/**
 * <h3 align="center">Your Data, Managed.</h3>
 * <p align="center">🌲 Get back to Nature 🐿️ Or shipping 💚</p>
 *
 * - ⚡️ Fast
 * - 📦 Tiny
 * - ✨ Optimized
 * - 🚀 Scalable
 * - ⚛️ Universal
 * - ☢️ Reactive
 *
 * SchemaRecord is a reactive object that transforms raw data from an [associated cache](../classes/<Interface>%20Cache)
 * into reactive data backed by Signals.
 *
 * The shape of the object and the transformation of raw cache data into its
 * reactive form is controlled by a resource schema.
 *
 * Resource schemas are simple JSON, allowing them to be defined and delivered from anywhere.
 *
 * The capabilities that SchemaRecord brings to [*Warp***Drive**](https://github.com/emberjs/data/)
 * will simplify even the most complex parts of your app's state management.
 *
 * ## Installation
 *
 *
 * Install using your javascript package manager of choice. For instance
 * with [pnpm](https://pnpm.io/)
 *
 * ```cli
 * pnpm add @warp-drive/schema-record
 * ```
 *
 * ## Getting Started
 *
 * If this package is how you are first learning about WarpDrive/EmberData, we
 * recommend starting with learning about [Requests](../modules/@ember-data%2Frequest)
 * and the [Store](../modules/@ember-data%2Fstore).
 *
 * ## 🚀 Setup
 *
 * SchemaRecord integrates with WarpDrive via the Store's resource lifecycle hooks.
 * When WarpDrive needs to create a new record instance to give reactive access to
 * a resource in the cache, it calls `instantiateRecord`. When it no longer needs
 * that instance, it will call `teardownRecord`.
 *
 * ```diff
 * import Store from '@ember-data/store';
 * +import { instantiateRecord, teardownRecord, registerDerivations, SchemaService } from '@warp-drive/schema-record';
 *
 * class AppStore extends Store {
 *
 * +  createSchemaService() {
 * +    const schema = new SchemaService();
 * +    registerDerivations(schema);
 * +    return schema;
 * +  }
 *
 * +  instantiateRecord(identifier, createArgs) {
 * +    return instantiateRecord(this, identifier, createArgs);
 * +  }
 *
 * +  teardownRecord(record) {
 * +    return teardownRecord(record);
 * +  }
 * }
 * ```
 *
 * Any Store API that returns a record instance will use the `instantiateRecord`
 * hook configured above to instantiate a SchemaRecord once this is in place.
 * After that, its up to you what SchemaRecord can do.
 *
 * ## Start Using
 *
 * @module @warp-drive/schema-record
 * @main @warp-drive/schema-record
 */
export { instantiateRecord, teardownRecord } from './-private/hooks';
export { type Transformation, SchemaService, withDefaults, fromIdentity, registerDerivations } from './-private/schema';
export { type SchemaRecord } from './-private/record';
export { Checkout } from './-private/symbols';
