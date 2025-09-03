/**
 * # About
 *
 * This module provides an implementation of reactive objects that a Store may use for creating
 * reactive representations of the raw data for requests, resources and their relationships
 * stored in the cache.
 *
 * - For configuring the store to use these reactive objects, see [The Setup Guide](/guides/1-configuration/2-setup/1-universal.md)
 * - For defining resource schemas, see [The Schema Guide](/guides)
 *
 * Any method that returns a record instance will use the `instantiateRecord`
 * hook configured above to instantiate a ReactiveResource once this is in place.
 * After that, its up to you what ReactiveResource can do.
 *
 * ## Modes
 *
 * ReactiveResource has two modes: `legacy` and `polaris`.
 *
 * **LegacyMode** can be used to emulate the behaviors and capabilities of WarpDrive's `Model` class,
 * and because there is little distinction between Model and a ReactiveResource in LegacyMode we refer
 * to both of these approaches as LegacyMode. This mode is the default experience in V5.
 *
 * In LegacyMode:
 *
 * - records are mutable
 * - local changes immediately reflect app wide
 * - records have all the APIs of Model (references, state props, currentState, methods etc)
 * - the continued use of `@warp-drive/legacy` is required (though most imports from it can be removed)
 * - `async: true` relationships are supported (but not recommended outside of [LinksMode](https://github.com/warp-drive-data/warp-drive/blob/main/guides/relationships/features/links-mode.md))
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
 * - `async: true` relationships are not supported (see [LinksMode](https://github.com/warp-drive-data/warp-drive/blob/main/guides/relationships/features/links-mode.md))
 * - The `@warp-drive/legacy` package is not required
 *
 * These modes are interopable. The reactive object (record) for a resource in PolarisMode can relate to
 * a record in LegacyMode and vice-versa. This interopability is true whether the record in LegacyMode is
 * a ReactiveResource or a Model.
 *
 * ---
 *
 * ## Basic Usage
 *
 * ReactiveResource is a reactive object that transforms raw data from an associated
 * cache into reactive data backed by Signals.
 *
 * The shape of the object and the transformation of raw cache data into its
 * reactive form is controlled by a resource schema.
 *
 * For instance, lets say your API is a [{json:api}](https://jsonapi.org) and your store is using
 * the Cache provided by [@warp-drive/json-api](/api/@warp-drive/json-api), and a request
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
 *   [Checkout](): Promise<EditableUser>
 * }>
 * ```
 *
 * Note how based on the schema the reactive object we receive is able to produce
 * `name` on user (despite no name field being in the cache), provide `$type`
 * pulled from the identity of the resource, and flatten the individual attributes
 * and relationships onto the record for easier use.
 *
 * Notice also how we typed this object with `readonly`. This is because while
 * ReactiveResource instances are ***deeply reactive***, they are also ***immutable***.
 *
 * We can mutate a ReactiveResource only be explicitly asking permission to do so, and
 * in the process gaining access to an editable copy. The immutable version will
 * not show any in-process edits made to this editable copy.
 *
 * ```ts
 * import { Checkout } from '@warp-drive/schema-record';
 *
 * const editable = await user[Checkout]();
 * ```
 *
 * ## Utilities
 *
 * ReactiveResource provides a schema builder that simplifies setting up a couple of
 * conventional fields like identity and `$type`. We can rewrite the schema
 * definition above using this utility like so:
 *
 * ```ts
 * import { withDefaults } from '@warp-drive/core/reactive';
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
 * ## Type Support
 *
 * ### Resource Schemas
 *
 * - {@link PolarisResourceSchema}
 * - {@link LegacyResourceSchema}
 * - {@link ObjectSchema}
 *
 * ### Resource Schema Type Utils
 *
 * - {@link resourceSchema}
 * - {@link objectSchema}
 * - {@link isResourceSchema}
 * - {@link isLegacyResourceSchema}
 *
 * ### Field Schemas
 *
 * - {@link LegacyModeFieldSchema}
 * - {@link PolarisModeFieldSchema}
 *
 * @module
 */
import { checkout } from './reactive/-private/record.ts';
import type {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLegacyResourceSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isResourceSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LegacyModeFieldSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LegacyResourceSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ObjectSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  objectSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PolarisModeFieldSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PolarisResourceSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resourceSchema,
} from './types/schema/fields';

export { instantiateRecord, teardownRecord } from './reactive/-private/hooks';
export {
  type CAUTION_MEGA_DANGER_ZONE_Extension,
  type ProcessedExtension,
  type ExtensionDef,
  type Transformation,
  SchemaService,
  withDefaults,
  fromIdentity,
  registerDerivations,
} from './reactive/-private/schema';
export { commit, type ReactiveResource } from './reactive/-private/record.ts';

export { checkout };
export {
  /** @deprecated use {@link checkout} */
  Checkout,
} from './reactive/-private/symbols';
export {
  type ReactiveDocument,
  type ReactiveDataDocument,
  type ReactiveErrorDocument,
} from './reactive/-private/document';
export { getExpensiveRequestSubscription } from './store/-private/new-core-tmp/expensive-subscription.ts';
export {
  createRequestSubscription,
  getRequestState,
  getPromiseState,
  type PromiseState,
  type RequestState,
} from './store/-private';
