/**
 * <h3 align="center">Your Data, Managed.</h3>
 * <p align="center">🌲 Get back to Nature 🐿️ Or shipping 💚</p>
 *
 * SchemaRecord is a reactive object that transforms raw data from an {@link Cache | associated cache}
 * into reactive data backed by Signals. The shape of the object and the transformation of raw cache data into its
 * reactive form is controlled by a resource schema. Resource schemas are simple JSON, allowing them to be defined
 * and delivered from anywhere.
 *
 * The capabilities that SchemaRecord brings to [*Warp***Drive**](https://github.com/emberjs/data/)
 * will simplify even the most complex parts of your app's state management.
 *
 * ## Installation
 *
 * Install using your javascript package manager of choice. For instance
 * with [pnpm](https://pnpm.io/)
 *
 * ```cli
 * pnpm add @warp-drive/schema-record
 * ```
 *
 *
 * ---
 *
 *
 * ## Getting Started
 *
 * If this package is how you are first learning about WarpDrive/EmberData, we
 * recommend starting with learning about [Requests](../modules/@ember-data%2Frequest)
 * and the [Store](../modules/@ember-data%2Fstore).
 *
 *
 * ---
 *
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
 *
 * ---
 *
 *
 * ## Start Using
 *
 * ### Modes
 *
 * SchemaRecord has two modes: `legacy` and `polaris`.
 *
 * **LegacyMode** can be used to emulate the behaviors and capabilities of WarpDrive's `Model` class,
 * and because there is little distinction between Model and SchemaRecord in LegacyMode we refer
 * to both of these approaches as LegacyMode. This mode is the default experience in V5.
 *
 * In LegacyMode:
 *
 * - records are mutable
 * - local changes immediately reflect app wide
 * - records have all the APIs of Model (references, state props, currentState, methods etc)
 * - the continued use of `@ember-data/model` and `@ember-data/legacy-compat` packages is required (though most imports from them can be removed)
 * - `async: true` relationships are supported (but not recommended outside of [LinksMode](https://github.com/emberjs/data/blob/main/guides/relationships/features/links-mode.md))
 *
 * ---
 *
 * **PolarisMode** is an upcoming suite of features that will become the default experience in V6.
 *
 * In PolarisMode:
 *
 * - records are immutable, unless creating a new resource or explicitly checking out a record for editing
 * - local changes are isolated until committed, displaying only via the editable version of the record
 * - records have a more limited API, focused on only what is in their schema.
 * - some common operations may have more friction to perform because intended utilities are not yet available
 * - `async: true` relationships are not supported (see [LinksMode](https://github.com/emberjs/data/blob/main/guides/relationships/features/links-mode.md))
 * - `@ember-data/model` and `@ember-data/legacy-compat` packages are not required
 *
 * These modes are interopable. The reactive object (record) for a resource in PolarisMode can relate to
 * a record in LegacyMode and vice-versa. This interopability is true whether the record in LegacyMode is
 * a SchemaRecord or a Model.
 *
 * ---
 *
 * ### About
 *
 * SchemaRecord is a reactive object that transforms raw data from an associated
 * cache into reactive data backed by Signals.
 *
 * The shape of the object and the transformation of raw cache data into its
 * reactive form is controlled by a resource schema.
 *
 * For instance, lets say your API is a [{JSON:API}](https://jsonapi.org) and your store is using
 * the Cache provided by [@ember-data/json-api](../modules/@ember-data%2Fjson-api), and a request
 * returns the following raw data:
 *
 * ```ts
 * {
 *   data: {
 *     type: 'user',
 *     id: '1',
 *     attributes: { firstName: 'Chris', lastName: 'Thoburn' },
 *     relationships: { pets: { data: [{ type: 'dog', id: '1' }] }}
 *   },
 *   included: [
 *     {
 *       type: 'dog',
 *       id: '1',
 *       attributes: { name: 'Rey' },
 *       relationships: { owner: { data: { type: 'user', id: '1' }}}
 *     }
 *   ]
 * }
 * ```
 *
 * We could describe the `'user'` and `'dog'` resources in the above payload
 * with the following schemas:
 *
 * ```ts
 * store.schema.registerResources([
 *   {
 *     type: 'user',
 *     identity: { type: '@id', name: 'id' },
 *     fields: [
 *       {
 *         type: '@identity',
 *         name: '$type',
 *         kind: 'derived',
 *         options: { key: 'type' },
 *       },
 *       { kind: 'field', name: 'firstName' },
 *       { kind: 'field', name: 'lastName' },
 *       {
 *         kind: 'derived',
 *         name: 'name',
 *         type: 'concat',
 *         options: { fields: ['firstName', 'lastName'], separator: ' ' }
 *       },
 *       {
 *         kind: 'hasMany',
 *         name: 'pets',
 *         type: 'pet',
 *         options: {
 *           async: false,
 *           inverse: 'owner',
 *           polymorphic: true,
 *           linksMode: true,
 *         }
 *       }
 *     ]
 *   },
 *   {
 *     type: 'dog',
 *     identity: { type: '@id', name: 'id' },
 *     fields: [
 *       {
 *         type: '@identity',
 *         name: '$type',
 *         kind: 'derived',
 *         options: { key: 'type' },
 *       },
 *       { kind: 'field', name: 'name' },
 *       {
 *         kind: 'belongsTo',
 *         name: 'owner',
 *         type: 'user',
 *         options: {
 *           async: false,
 *           inverse: 'pets',
 *           as: 'pet',
 *           linksMode: true,
 *         }
 *       }
 *     ]
 *   }
 * ]);
 * ```
 *
 * With these schemas in place, the reactive objects that the store would
 * provide us whenever we encountered a `'user'` or a `'dog'` would be:
 *
 * ```ts
 *
 * interface Pet {
 *   readonly id: string;
 *   readonly owner: User;
 * }
 *
 * interface Dog extends Pet {
 *   readonly $type: 'dog';
 *   readonly name: string;
 * }
 *
 * interface EditableUser {
 *   readonly $type: 'user';
 *   readonly id: string;
 *   firstName: string;
 *   lastName: string;
 *   readonly name: string;
 *   pets: Array<Dog | Pet>;
 * }
 *
 * interface User {
 *   readonly $type: 'user';
 *   readonly id: string;
 *   readonly firstName: string;
 *   readonly lastName: string;
 *   readonly name: string;
 *   readonly pets: Readonly<Array<Dog | Pet>>;
 *   [Checkout]: Promise<EditableUser>
 * }>
 * ```
 *
 * Note how based on the schema the reactive object we receive is able to produce
 * `name` on user (despite no name field being in the cache), provide `$type`
 * pulled from the identity of the resource, and flatten the individual attributes
 * and relationships onto the record for easier use.
 *
 * Notice also how we typed this object with `readonly`. This is because while
 * SchemaRecord instances are ***deeply reactive***, they are also ***immutable***.
 *
 * We can mutate a SchemaRecord only be explicitly asking permission to do so, and
 * in the process gaining access to an editable copy. The immutable version will
 * not show any in-process edits made to this editable copy.
 *
 * ```ts
 * import { Checkout } from '@warp-drive/schema-record';
 *
 * const editable = await user[Checkout]();
 * ```
 *
 * ---
 *
 * ### Utilities
 *
 * SchemaRecord provides a schema builder that simplifies setting up a couple of
 * conventional fields like identity and `$type`. We can rewrite the schema
 * definition above using this utility like so:
 *
 * ```ts
 * import { withDefaults } from '@warp-drive/schema-record';
 *
 * store.schema.registerResources([
 *   withDefaults({
 *     type: 'user',
 *     fields: [
 *       { kind: 'field', name: 'firstName' },
 *       { kind: 'field', name: 'lastName' },
 *       {
 *         kind: 'derived',
 *         name: 'name',
 *         type: 'concat',
 *         options: { fields: ['firstName', 'lastName'], separator: ' ' }
 *       },
 *       {
 *         kind: 'hasMany',
 *         name: 'pets',
 *         type: 'pet',
 *         options: {
 *           async: false,
 *           inverse: 'owner',
 *           polymorphic: true,
 *           linksMode: true,
 *           resetOnRemoteUpdate: false,
 *         }
 *       }
 *     ]
 *   }),
 *   withDefaults({
 *     type: 'dog',
 *     fields: [
 *       { kind: 'field', name: 'name' },
 *       {
 *         kind: 'belongsTo',
 *         name: 'owner',
 *         type: 'user',
 *         options: {
 *           async: false,
 *           inverse: 'pets',
 *           as: 'pet',
 *           linksMode: true,
 *           resetOnRemoteUpdate: false,
 *         }
 *       }
 *     ]
 *   })
 * ]);
 * ```
 *
 * Additionally, `@warp-drive/core-types` provides several utilities for type-checking and narrowing schemas.
 *
 * - {@link PolarisResourceSchema}
 * - {@link LegacyResourceSchema}
 * - {@link ObjectSchema}
 * - {@link resourceSchema}
 * - {@link objectSchema}
 * - {@link isResourceSchema}
 * - {@link isLegacyResourceSchema}
 *
 * ---
 *
 * ### Field Schemas
 *
 * LegacyMode
 *
 * - {@link LegacyModeFieldSchema}

 * PolarisMode
 *
 * - {@link PolarisModeFieldSchema}
 *
 * @module
 */
export { instantiateRecord, teardownRecord } from './reactive/-private/hooks';
export {
  type Transformation,
  SchemaService,
  withDefaults,
  fromIdentity,
  registerDerivations,
} from './reactive/-private/schema';
export { type SchemaRecord } from './reactive/-private/record';
export { Checkout } from './reactive/-private/symbols';
