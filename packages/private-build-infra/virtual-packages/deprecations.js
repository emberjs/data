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
 * can be found [here](https://github.com/emberjs/data/tree/main/packages/private-build-infra/addon/current-deprecations.ts "List of EmberData Deprecations")
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
 * id: ember-data:rsvp-unresolved-async
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
 * id: ember-data:model-save-promise
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
 * id: ember-data:deprecate-snapshot-model-class-access
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
 * id: ember-data:deprecate-store-find
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
 * id: ember-data:deprecate-has-record-for-id
 *
 * Deprecates `store.hasRecordForId(type, id)` in favor of `store.peekRecord({ type, id }) !== null`.
 *
 * Broadly speaking, while the ability to query for presence is important, a key distinction exists
 * between these methods that make relying on `hasRecordForId` unsafe, as it may report `true` for a
 * record which is not-yet loaded and un-peekable. `peekRecord` offers a safe mechanism by which to check
 * for whether a record is present in a usable manner.
 *
 * @property DEPRECATE_HAS_RECIRD
 * @since 4.5
 * @until 5.0
 * @public
 */
export const DEPRECATE_HAS_RECORD = '4.5';

/**
 * id: ember-data:deprecate-string-arg-schemas
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
 * id: ember-data:deprecate-secret-adapter-fallback
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
 * id: ember-data:deprecate-model-reopen
 * =====================================
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
 * id: ember-data:deprecate-model-reopenclass
 * =====================================
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
 * id: ember-data:deprecate-early-static
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
 * id: ember-data:deprecate-errors-hash-to-array-helper
 * id: ember-data:deprecate-errors-array-to-hash-helper
 * id: ember-data:deprecate-normalize-modelname-helper
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
 * id: ember-data:deprecate-promise-many-array-behavior
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
 * id: ember-data:deprecate-v1cache-store-apis
 *
 * @property DEPRECATE_V1CACHE_STORE_APIS
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_V1CACHE_STORE_APIS = '4.7';

/**
 * id: ember-data:deprecate-non-strict-relationships
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
 * id: ember-data:deprecate-non-strict-relationships
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
 * id: ember-data:deprecate-non-strict-relationships
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
 * id:
 *
 * @property DEPRECATE_V1_RECORD_DATA
 * @since 4.12
 * @until 5.0
 * @public
 */
export const DEPRECATE_V1_RECORD_DATA = '4.12';

/**
 * id:
 *
 * @property DEPRECATE_A_USAGE
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_A_USAGE = '4.7';

/**
 * id:
 *
 * @property DEPRECATE_PROMISE_PROXIES
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_PROMISE_PROXIES = '4.7';

/**
 * id:
 *
 * @property DEPRECATE_ARRAY_LIKE
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_ARRAY_LIKE = '4.7';

/**
 * id:
 *
 * @property DEPRECATE_COMPUTED_CHAINS
 * @since 5.0
 * @until 6.0
 * @public
 */
export const DEPRECATE_COMPUTED_CHAINS = '5.0';

/**
 * id:
 *
 * @property DEPRECATE_NON_EXPLICIT_POLYMORPHISM
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_NON_EXPLICIT_POLYMORPHISM = '4.7';

/**
 * id:
 *
 * @property DEPRECATE_INSTANTIATE_RECORD_ARGS
 * @since 4.7
 * @until 5.0
 * @public
 */
export const DEPRECATE_INSTANTIATE_RECORD_ARGS = '4.12';

/**
 * id:
 *
 * @property DEPRECATE_CREATE_RECORD_DATA_FOR_HOOK
 * @since 4.12
 * @until 5.0
 * @public
 */
export const DEPRECATE_CREATE_RECORD_DATA_FOR_HOOK = '4.12';
