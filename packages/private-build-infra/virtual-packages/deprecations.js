/**
 * ## Deprecations
 *
 * EmberData allows users to opt-in and remove code that exists to support deprecated
 * behaviors.
 *
 * If your app has resolved all deprecations present in a given version,
 * you may specify that version as your "compatibility" version to remove
 * the code that supported the deprecated behavior from your app.
 *
 * For instance, if a deprecation was introduced in 3.13, and the app specifies
 * 3.13 as its minimum version compatibility, any deprecations introduced before
 * or during 3.13 would be stripped away.
 *
 * An app can use a different version than what it specifies as it's compatibility
 * version. For instance, an App could be using `3.16` while specifying compatibility
 * with `3.12`. This would remove any deprecations that were present in or before `3.12`
 * but keep support for anything deprecated in or above `3.13`.
 *
 * ### Configuring Compatibility
 *
 * To configure your compatibility version, set the `compatWith` to the version you
 * are compatible with on the `emberData` config in your `ember-cli-build.js` file.
 *
 * ```js
 * let app = new EmberApp(defaults, {
 *   emberData: {
 *     compatWith: '3.12',
 *   },
 * });
 * ```
 *
 * Alternatively, individual deprecations can be resolved (and thus have its support stripped)
 * via one of the flag names listed below. For instance, given a flag named `DEPRECATE_FOO_BEHAVIOR`.
 *
 * This capability is interopable with `compatWith`. You may set `compatWith` and then selectively resolve
 * additional deprecations, or set compatWith and selectively un-resolve specific deprecations.
 *
 * Note: EmberData does not test against permutations of deprecations being stripped, our tests run against
 * "all deprecated code included" and "all deprecated code removed". Unspecified behavior may sometimes occur
 * when removing code for only some deprecations associated to a version number.
 *
 * ```js
 * let app = new EmberApp(defaults, {
 *   emberData: {
 *     deprecations: {
 *       DEPRECATE_FOO_BEHAVIOR: false // set to false to strip this code
 *       DEPRECATE_BAR_BEHAVIOR: true // force to true to not strip this code
 *     }
 *   }
 * })
 * ```
 *
 * The complete list of which versions specific deprecations will be removed in
 * can be found [here](https://github.com/emberjs/data/blob/main/packages/private-build-infra/virtual-packages/deprecations.js "List of EmberData Deprecations")
 *
 * @module @ember-data/deprecations
 * @main @ember-data/deprecations
 */

/**
 * The following list represents deprecations currently active.
 *
 * Some deprecation flags guard multiple deprecation IDs. All
 * associated IDs are listed.
 *
 * @class CurrentDeprecations
 * @public
 */
export const DEPRECATE_CATCH_ALL = '99.0';
export const DEPRECATE_3_12 = '3.12';

/**
 * **id: ember-data:rsvp-unresolved-async**
 *
 * Deprecates when a request promise did not resolve prior to the store tearing down.
 *
 * Note: in most cases even with the promise guard that is now being deprecated
 * a test crash would still be encountered.
 *
 * To resolve: Tests or Fastboot instances which crash need to find triggers requests
 * and properly await them before tearing down.
 *
 * @property DEPRECATE_RSVP_PROMISE
 * @since 4.4
 * @until 5.0
 * @public
 */
export const DEPRECATE_RSVP_PROMISE = '4.4';

/**
 * **id: ember-data:model-save-promise**
 *
 * Affects
 * - model.save / store.saveRecord
 * - model.reload
 *
 * Deprecates the promise-proxy returned by these methods in favor of
 * a Promise return value.
 *
 * To resolve this deprecation, `await` or `.then` the return value
 * before doing work with the result instead of accessing values via
 * the proxy.
 *
 * To continue utilizing flags such as `isPending` in your templates
 * consider using [ember-promise-helpers](https://github.com/fivetanley/ember-promise-helpers)
 *
 * @property DEPRECATE_SAVE_PROMISE_ACCESS
 * @since 4.4
 * @until 5.0
 * @public
 */
export const DEPRECATE_SAVE_PROMISE_ACCESS = '4.4';

/**
 * **id: ember-data:deprecate-snapshot-model-class-access**
 *
 * Deprecates accessing the factory class for a given resource type
 * via properties on various classes.
 *
 * Guards
 *
 * - SnapshotRecordArray.type
 * - Snapshot.type
 * - RecordArray.type
 *
 * Use `store.modelFor(<resource-type>)` instead.
 *
 * @property DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS
 * @since 4.5
 * @until 5.0
 * @public
 */
export const DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS = '4.5';

/**
 * **id: ember-data:deprecate-store-find**
 *
 * Deprecates using `store.find` instead of `store.findRecord`. Typically
 * `store.find` is a mistaken call that occurs when using implicit route behaviors
 * in Ember which attempt to derive how to load data via parsing the route params
 * for a route which does not implement a `model` hook.
 *
 * To resolve, use `store.findRecord`. This may require implementing an associated
 * route's `model() {}` hook.
 *
 * @property DEPRECATE_STORE_FIND
 * @since 4.5
 * @until 5.0
 * @public
 */
export const DEPRECATE_STORE_FIND = '4.5';

/**
 * **id: ember-data:deprecate-has-record-for-id**
 *
 * Deprecates `store.hasRecordForId(type, id)` in favor of `store.peekRecord({ type, id }) !== null`.
 *
 * Broadly speaking, while the ability to query for presence is important, a key distinction exists
 * between these methods that make relying on `hasRecordForId` unsafe, as it may report `true` for a
 * record which is not-yet loaded and un-peekable. `peekRecord` offers a safe mechanism by which to check
 * for whether a record is present in a usable manner.
 *
 * @property DEPRECATE_HAS_RECORD
 * @since 4.5
 * @until 5.0
 * @public
 */
export const DEPRECATE_HAS_RECORD = '4.5';

/**
 * **id: ember-data:deprecate-string-arg-schemas**
 *
 * Deprecates `schema.attributesDefinitionFor(type)` and
 * `schema.relationshipsDefinitionFor(type)` in favor of
 * a consistent object signature (`identifier | { type }`).
 *
 * To resolve change
 *
 * ```diff
 * - store.getSchemaDefinitionService().attributesDefinitionFor('user')
 * + store.getSchemaDefinitionService().attributesDefinitionFor({ type: 'user' })
 * ```
 *
 * @property DEPRECATE_STRING_ARG_SCHEMAS
 * @since 4.5
 * @until 5.0
 * @public
 */
export const DEPRECATE_STRING_ARG_SCHEMAS = '4.5';

/**
 * **id: ember-data:deprecate-secret-adapter-fallback**
 *
 * Deprecates the secret `-json-api` fallback adapter in favor
 * or an explicit "catch all" application adapter. In addition
 * to this deprecation ensuring the user has explicitly chosen an
 * adapter, this ensures that the user may choose to use no adapter
 * at all.
 *
 * Simplest fix:
 *
 * *<project>/app/adapters/application.js*
 * ```js
 * export { default } from '@ember-data/adapter/json-api';
 * ```
 *
 * @property DEPRECATE_JSON_API_FALLBACK
 * @since 4.5
 * @until 5.0
 * @public
 */
export const DEPRECATE_JSON_API_FALLBACK = '4.5';

/**
 * **id: ember-data:deprecate-model-reopen**
 *
 * ----
 *
 * For properties known ahead of time, instead of
 *
 * ```ts
 * class User extends Model { @attr firstName; }
 *
 * User.reopen({ lastName: attr() });
 * ```
 *
 * Extend `User` again or include it in the initial definition.
 *
 * ```ts
 * class User extends Model { @attr firstName; @attr lastName }
 * ```
 *
 * For properties generated dynamically, consider registering
 * a `SchemaDefinitionService` with the store , as such services
 * are capable of dynamically adjusting their schemas, and utilize
 * the `instantiateRecord` hook to create a Proxy based class that
 * can react to the changes in the schema.
 *
 *
 * Use Foo extends Model to extend your class instead
 *
 *
 *
 *
 * **id: ember-data:deprecate-model-reopenclass**
 *
 * ----
 *
 * Instead of reopenClass, define `static` properties with native class syntax
 * or add them to the final object.
 *
 * ```ts
 * // instead of
 * User.reopenClass({ aStaticMethod() {} });
 *
 * // do this
 * class User {
 *   static aStaticMethod() {}
 * }
 *
 * // or do this
 * User.aStaticMethod = function() {}
 * ```
 *
 *
 * @property DEPRECATE_MODEL_REOPEN
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_MODEL_REOPEN = '4.7';

/**
 * **id: ember-data:deprecate-early-static**
 *
 * This deprecation triggers if static computed properties
 * or methods are triggered without looking up the record
 * via the store service's `modelFor` hook. Accessing this
 * static information without looking up the model via the
 * store most commonly occurs when
 *
 * - using ember-cli-mirage (to fix, refactor to not use its auto-discovery of ember-data models)
 * - importing a model class and accessing its static information via the import
 *
 * Instead of
 *
 * ```js
 * import User from 'my-app/models/user';
 *
 * const relationships = User.relationshipsByName;
 * ```
 *
 * Do *at least* this
 *
 * ```js
 * const relationships = store.modelFor('user').relationshipsByName;
 * ```
 *
 * However, the much more future proof refactor is to not use `modelFor` at all but instead
 * to utilize the schema service for this static information.
 *
 * ```js
 * const relationships = store.getSchemaDefinitionService().relationshipsDefinitionFor({ type: 'user' });
 * ```
 *
 *
 * @property DEPRECATE_EARLY_STATIC
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_EARLY_STATIC = '4.7';

/**
 * **id: ember-data:deprecate-errors-hash-to-array-helper**
 * **id: ember-data:deprecate-errors-array-to-hash-helper**
 * **id: ember-data:deprecate-normalize-modelname-helper**
 *
 * Deprecates `errorsHashToArray` `errorsArrayToHash` and `normalizeModelName`
 *
 * Users making use of these (already private) utilities can trivially copy them
 * into their own codebase to continue using them, though we recommend refactoring
 * to a more direct conversion into the expected errors format for the errors helpers.
 *
 * For refactoring normalizeModelName we also recommend following the guidance in
 * [RFC#740 Deprecate Non-Strict Types](https://github.com/emberjs/rfcs/pull/740).
 *
 *
 * @property DEPRECATE_HELPERS
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_HELPERS = '4.7';

/**
 * **id: ember-data:deprecate-promise-many-array-behavior**
 *
 * [RFC Documentation](https://rfcs.emberjs.com/id/0745-ember-data-deprecate-methods-on-promise-many-array)
 *
 * This deprecation deprecates accessing values on the asynchronous proxy
 * in favor of first "resolving" or "awaiting" the promise to retrieve a
 * synchronous value.
 *
 * Template iteration of the asynchronous value will still work and not trigger
 * the deprecation, but all JS access should be avoided and HBS access for anything
 * but `{{#each}}` should also be refactored.
 *
 * Recommended approaches include using the addon `ember-promise-helpers`, using
 * Ember's `resource` pattern (including potentially the addon `ember-data-resources`),
 * resolving the value in routes/provider components, or using the references API.
 *
 * An example of using the [hasMany](https://api.emberjs.com/ember-data/4.11/classes/Model/methods/hasMany?anchor=hasMany) [reference API](https://api.emberjs.com/ember-data/release/classes/HasManyReference):
 *
 * ```ts
 * // get the synchronous "ManyArray" value for the asynchronous "friends" relationship.
 * // note, this will return `null` if the relationship has not been loaded yet
 * const value = person.hasMany('friends').value();
 *
 * // to get just the list of related IDs
 * const ids = person.hasMany('friends').ids();
 * ```
 *
 * References participate in autotracking and getters/cached getters etc. which consume them
 * will recompute if the value changes.
 *
 * @property DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS = '4.7';

/**
 * **id: ember-data:deprecate-v1cache-store-apis**
 *
 * Deprecates various methods on the store and store-cache-wrapper
 * that were specific to the v1 cache.
 *
 * Most applications should not encounter this deprecation, but if you
 * do it means that an addon you are using is likely using these methods
 * as part of having implemented its own cache.
 *
 * The implementation will need to update to the V2 Cache API equivalent method
 * as detailed in the deprecation method. Generally this means the implementation
 * needs to be more broadly reworked to use the newer V2.1 Cache API.
 *
 * @property DEPRECATE_V1CACHE_STORE_APIS
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_V1CACHE_STORE_APIS = '4.7';

/**
 * **id: ember-data:deprecate-non-strict-relationships**
 *
 * Deprecates when belongsTo and hasMany relationships are defined
 * without specifying the inverse record's type.
 *
 * Instead of
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany() employees;
 * }
 * class Employee extends Model {
 *   @belongsTo() company;
 * }
 * ```
 *
 * Use
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee', { async: true, inverse: 'company' }) employees;
 * }
 *
 * class Employee extends Model {
 *   @belongsTo('company', { async: true, inverse: 'employees' }) company;
 * }
 * ```
 *
 * @property DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE = '4.7';

/**
 * **id: ember-data:deprecate-non-strict-relationships**
 *
 * Deprecates when belongsTo and hasMany relationships are defined
 * without specifying whether the relationship is asynchronous.
 *
 * The current behavior is that relationships which do not define
 * this setting are aschronous (`{ async: true }`).
 *
 * Instead of
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee') employees;
 * }
 * class Employee extends Model {
 *   @belongsTo('company') company;
 * }
 * ```
 *
 * Use
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee', { async: true, inverse: 'company' }) employees;
 * }
 *
 * class Employee extends Model {
 *   @belongsTo('company', { async: true, inverse: 'employees' }) company;
 * }
 * ```
 *
 * @property DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC = '4.7';

/**
 * **id: ember-data:deprecate-non-strict-relationships**
 *
 * Deprecates when belongsTo and hasMany relationships are defined
 * without specifying the inverse field on the related type.
 *
 * The current behavior is that relationships which do not define
 * this setting have their inverse determined at runtime, which is
 * potentially non-deterministic when mixins and polymorphism are involved.
 *
 * If an inverse relationship exists and you wish changes on one side to
 * reflect onto the other side, use the inverse key. If you wish to not have
 * changes reflected or no inverse relationship exists, specify `inverse: null`.
 *
 * Instead of
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee') employees;
 * }
 * class Employee extends Model {
 *   @belongsTo('company') company;
 * }
 * ```
 *
 * Use
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee', { async: true, inverse: 'company' }) employees;
 * }
 *
 * class Employee extends Model {
 *   @belongsTo('company', { async: true, inverse: 'employees' }) company;
 * }
 * ```
 *
 * Instead of
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee') employees;
 * }
 * class Employee extends Model {
 *   @attr name;
 * }
 * ```
 *
 * Use
 *
 * ```ts
 * class Company extends Model {
 *   @hasMany('employee', { async: true, inverse: null }) employees;
 * }
 *
 * class Employee extends Model {
 *   @attr name;
 * }
 * ```
 *
 * @property DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE = '4.7';

/**
 * **id: ember-data:deprecate-v1-cache**
 *
 * Deprecates instantiating a non-singleton cache via `store.createRecordDataFor`
 * in favor of a singleton-cache via `store.createCache`.
 *
 * Most applications should not encounter this deprecation, but if you
 * do it means that an addon you are using is likely using an unsupported cache
 * implementation.
 *
 * The implementation will need to update to the V2 Cache API and be integrated
 * via the `createCache` hook.
 *
 * @property DEPRECATE_V1_RECORD_DATA
 * @since 4.12
 * @until 5.0
 * @public
 */
export const DEPRECATE_V1_RECORD_DATA = '4.12';

/**
 * **id: ember-data:no-a-with-array-like**
 *
 * Deprecates when calling `A()` on an EmberData ArrayLike class
 * is detected. This deprecation may not always trigger due to complexities
 * in ember-source versions and the use (or disabling) of prototype extensions.
 *
 * To fix, just use the native array methods instead of the EmberArray methods
 * and refrain from wrapping the array in `A()`.
 *
 * Note that some computed property macros may themselves utilize `A()`, in which
 * scenario the computed properties need to be upgraded to octane syntax.
 *
 * For instance, instead of:
 *
 * ```ts
 * class extends Component {
 *   @filterBy('items', 'isComplete') completedItems;
 * }
 * ```
 *
 * Use the following:
 *
 * ```ts
 * class extends Component {
 *   get completedItems() {
 *     return this.items.filter(item => item.isComplete);
 *   }
 * }
 * ```
 *
 * @property DEPRECATE_A_USAGE
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_A_USAGE = '4.7';

/**
 * **id: ember-data:deprecate-promise-proxies**
 *
 * Additional Reading: [RFC#846 Deprecate Proxies](https://rfcs.emberjs.com/id/0846-ember-data-deprecate-proxies)
 *
 * Deprecates using the proxy object/proxy array capabilities of values returned from
 *
 *  - `store.findRecord`
 *  - `store.findAll`
 *  - `store.query`
 *  - `store.queryRecord`
 *  - `record.save`
 *  - `recordArray.save`
 *  - `recordArray.update`
 *
 * These methods will now return a native Promise that resolves with the value.
 *
 * Note that this does not deprecate the proxy behaviors of `PromiseBelongsTo`. See RFC for reasoning.
 * The opportunity should still be taken if available to stop using these proxy behaviors; however, this class
 * will remain until `import Model from '@ember-data/model';` is deprecated more broadly.
 *
 * @property DEPRECATE_PROMISE_PROXIES
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_PROMISE_PROXIES = '4.7';

/**
 * **id: ember-data:deprecate-array-like**
 *
 * Deprecates Ember "Array-like" methods on RecordArray and ManyArray.
 *
 * These are the arrays returned respectively by `store.peekAll()`, `store.findAll()`and
 * hasMany relationships on instance of Model or `record.hasMany('relationshipName').value()`.
 *
 * The appropriate refactor is to treat these arrays as native arrays and to use native array methods.
 *
 * For instance, instead of:
 *
 *  ```ts
 * users.firstObject;
 * ```
 *
 * Use:
 *
 * ```ts
 * users[0];
 * // or
 * users.at(0);
 * ```
 *
 * @property DEPRECATE_ARRAY_LIKE
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_ARRAY_LIKE = '4.7';

/**
 * **id: <none yet assigned>**
 *
 * This is a planned deprecation which will trigger when observer or computed
 * chains are used to watch for changes on any EmberData RecordArray, ManyArray
 * or PromiseManyArray.
 *
 * Support for these chains is currently guarded by the inactive deprecation flag
 * listed here.
 *
 * @property DEPRECATE_COMPUTED_CHAINS
 * @since 5.0
 * @until 6.0
 * @public
 */
export const DEPRECATE_COMPUTED_CHAINS = '5.0';

/**
 * **id: ember-data:non-explicit-relationships**
 *
 * Deprecates when polymorphic relationships are detected via inheritance or mixins
 * and no polymorphic relationship configuration has been setup.
 *
 * For further reading please review [RFC#793](https://rfcs.emberjs.com/id/0793-polymporphic-relations-without-inheritance)
 * which introduced support for explicit relationship polymorphism without
 * mixins or inheritance.
 *
 * You may still use mixins and inheritance to setup your polymorphism; however, the class
 * structure is no longer what drives the design. Instead polymorphism is "traits" based or "structural":
 * so long as each model which can satisfy the polymorphic relationship defines the inverse in the same
 * way they work.
 *
 * Notably: `inverse: null` relationships can receive any type as a record with no additional configuration
 * at all.
 *
 * Example Polymorphic Relationship Configuration
 *
 * ```ts
 * // polymorphic relationship
 * class Tag extends Model {
 *    @hasMany("taggable", { async: false, polymorphic: true, inverse: "tags" }) tagged;
 * }
 *
 * // an inverse concrete relationship (e.g. satisfies "taggable")
 * class Post extends Model {
 *    @hasMany("tag", { async: false, inverse: "tagged", as: "taggable" }) tags;
 * }
 * ```
 *
 * @property DEPRECATE_NON_EXPLICIT_POLYMORPHISM
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_NON_EXPLICIT_POLYMORPHISM = '4.7';

/**
 * **id: ember-data:deprecate-instantiate-record-args**
 *
 * Deprecates using the former 3rd and 4th arguments to `Store.instantiateRecord` which are now
 * available as properties on the store.
 *
 * **old**
 * ```ts
 * {
 *   instantiateRecord(identifier, createArgs, recordDataFor, notifications) {
 *     const cache = recordDataFor(identifier);
 *   }
 * }
 * ```
 *
 * **new**
 * ```ts
 * {
 *   instantiateRecord(identifier, createArgs) {
 *      const { cache, notifications } = this;
 *   }
 * }
 * ```
 *
 * @property DEPRECATE_INSTANTIATE_RECORD_ARGS
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_INSTANTIATE_RECORD_ARGS = '4.12';

/**
 * **id: ember-data:deprecate-many-array-duplicates**
 *
 * FIXME: Document
 *
 * @property DEPRECATE_MANY_ARRAY_DUPLICATES
 * @since 4.12
 * @until 6.0
 * @public
 */
export const DEPRECATE_MANY_ARRAY_DUPLICATES_4_12 = '4.12';
export const DEPRECATE_MANY_ARRAY_DUPLICATES = '5.3';
