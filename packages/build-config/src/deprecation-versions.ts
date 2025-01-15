// ========================
// FOR CONTRIBUTING AUTHORS
//
// Deprecations here should also have guides PR'd to the emberjs deprecation app
//
// github: https://github.com/ember-learn/deprecation-app
// website: https://deprecations.emberjs.com
//
// Each deprecation should also be given an associated URL pointing to the
// relevant guide.
//
// URLs should be of the form: https://deprecations.emberjs.com/v<major>.x#toc_<fileName>
// where <major> is the major version of the deprecation and <fileName> is the
// name of the markdown file in the guides repo.
//
// ========================
//

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
 * const { setConfig } = await import('@warp-drive/build-config');
 *
 * let app = new EmberApp(defaults, {});
 *
 * setConfig(app, __dirname, { compatWith: '3.12' });
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
 * const { setConfig } = await import('@warp-drive/build-config');
 *
 * let app = new EmberApp(defaults, {});
 *
 * setConfig(app, __dirname, {
 *   deprecations: {
 *     DEPRECATE_FOO_BEHAVIOR: false // set to false to strip this code
 *     DEPRECATE_BAR_BEHAVIOR: true // force to true to not strip this code
 *   }
 * });
 * ```
 *
 * The complete list of which versions specific deprecations will be removed in
 * can be found [here](https://github.com/emberjs/data/blob/main/packages/build-config/src/virtual/deprecation-versions.ts "List of EmberData Deprecations")
 *
 * @module @warp-drive/build-config/deprecations
 * @main @warp-drive/build-config/deprecations
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
 * **id: ember-data:deprecate-many-array-duplicates**
 *
 * When the flag is `true` (default), adding duplicate records to a `ManyArray`
 * is deprecated in non-production environments. In production environments,
 * duplicate records added to a `ManyArray` will be deduped and no error will
 * be thrown.
 *
 * When the flag is `false`, an error will be thrown when duplicates are added.
 *
 * @property DEPRECATE_MANY_ARRAY_DUPLICATES
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_MANY_ARRAY_DUPLICATES = '4.12'; // '5.3';

/**
 * **id: ember-data:deprecate-non-strict-types**
 *
 * Currently, EmberData expects that the `type` property associated with
 * a resource follows several conventions.
 *
 * - The `type` property must be a non-empty string
 * - The `type` property must be singular
 * - The `type` property must be dasherized
 *
 * We are deprecating support for types that do not match this pattern
 * in order to unlock future improvements in which we can support `type`
 * being any string of your choosing.
 *
 * The goal is that in the future, you will be able to use any string
 * so long as it matches what your configured cache, identifier generation,
 * and schemas expect.
 *
 * E.G. It will matter not that your string is in a specific format like
 * singular, dasherized, etc. so long as everywhere you refer to the type
 * you use the same string.
 *
 * If using @ember-data/model, there will always be a restriction that the
 * `type` must match the path on disk where the model is defined.
 *
 * e.g. `app/models/foo/bar-bem.js` must have a type of `foo/bar-bem`
 *
 * @property DEPRECATE_NON_STRICT_TYPES
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_NON_STRICT_TYPES = '5.3';

/**
 * **id: ember-data:deprecate-non-strict-id**
 *
 * Currently, EmberData expects that the `id` property associated with
 * a resource is a string.
 *
 * However, for legacy support in many locations we would accept a number
 * which would then immediately be coerced into a string.
 *
 * We are deprecating this legacy support for numeric IDs.
 *
 * The goal is that in the future, you will be able to use any ID format
 * so long as everywhere you refer to the ID you use the same format.
 *
 * However, for identifiers we will always use string IDs and so any
 * custom identifier configuration should provide a string ID.
 *
 * @property DEPRECATE_NON_STRICT_ID
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_NON_STRICT_ID = '5.3';

/**
 * **id: ember-data:deprecate-non-unique-collection-payloads**
 *
 * Deprecates when the data for a hasMany relationship contains
 * duplicate identifiers.
 *
 * Previously, relationships would silently de-dupe the data
 * when received, but this behavior is being removed in favor
 * of erroring if the same related record is included multiple
 * times.
 *
 * For instance, in JSON:API the below relationship data would
 * be considered invalid:
 *
 * ```json
 * {
 *  "data": {
 *   "type": "article",
 *    "id": "1",
 *    "relationships": {
 *      "comments": {
 *        "data": [
 *          { "type": "comment", "id": "1" },
 *          { "type": "comment", "id": "2" },
 *          { "type": "comment", "id": "1" } // duplicate
 *        ]
 *     }
 *  }
 * }
 * ```
 *
 * To resolve this deprecation, either update your server to
 * not include duplicate data, or implement normalization logic
 * in either a request handler or serializer which removes
 * duplicate data from relationship payloads.
 *
 * @property DEPRECATE_NON_UNIQUE_PAYLOADS
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_NON_UNIQUE_PAYLOADS = '5.3';

/**
 * **id: ember-data:deprecate-relationship-remote-update-clearing-local-state**
 *
 * Deprecates when a relationship is updated remotely and the local state
 * is cleared of all changes except for "new" records.
 *
 * Instead, any records not present in the new payload will be considered
 * "removed" while any records present in the new payload will be considered "added".
 *
 * This allows us to "commit" local additions and removals, preserving any additions
 * or removals that are not yet reflected in the remote state.
 *
 * For instance, given the following initial state:
 *
 * remote: A, B, C
 * local: add D, E
 *        remove B, C
 * => A, D, E
 *
 *
 * If after an update, the remote state is now A, B, D, F then the new state will be
 *
 * remote: A, B, D, F
 * local: add E
 *        remove B
 * => A, D, E, F
 *
 * Under the old behavior the updated local state would instead have been
 * => A, B, D, F
 *
 * Similarly, if a belongsTo remote State was A while its local state was B,
 * then under the old behavior if the remote state changed to C, the local state
 * would be updated to C. Under the new behavior, the local state would remain B.
 *
 * If the remote state was A while its local state was `null`, then under the old
 * behavior if the remote state changed to C, the local state would be updated to C.
 * Under the new behavior, the local state would remain `null`.
 *
 * Thus the new correct mental model is that the state of the relationship at any point
 * in time is whatever the most recent remote state is, plus any local additions or removals
 * you have made that have not yet been reflected by the remote state.
 *
 * > Note: The old behavior extended to modifying the inverse of a relationship. So if
 * > you had local state not reflected in the new remote state, inverses would be notified
 * > and their state reverted as well when "resetting" the relationship.
 * > Under the new behavior, since the local state is preserved the inverses will also
 * > not be reverted.
 *
 * ### Resolving this deprecation
 *
 * Resolving this deprecation can be done individually for each relationship
 * or globally for all relationships.
 *
 * To resolve it globally, set the `DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE`
 * to `false` in ember-cli-build.js
 *
 * ```js
 * const { setConfig } = await import('@warp-drive/build-config');
 *
 * let app = new EmberApp(defaults, {});
 *
 * setConfig(app, __dirname, {
 *   deprecations: {
 *     // set to false to strip the deprecated code (thereby opting into the new behavior)
 *     DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: false
 *   }
 * });
 * ```
 *
 * To resolve this deprecation on an individual relationship, adjust the `options` passed to
 * the relationship. For relationships with inverses, both sides MUST be migrated to the new
 * behavior at the same time.
 *
 * ```js
 * class Person extends Model {
 *  @hasMany('person', {
 *    async: false,
 *    inverse: null,
 *    resetOnRemoteUpdate: false
 *  }) children;
 *
 *  @belongsTo('person', {
 *    async: false,
 *    inverse: null,
 *    resetOnRemoteUpdate: false
 *  }) parent;
 * }
 * ```
 *
 * > Note: false is the only valid value here, all other values (including missing)
 * > will be treated as true, where `true` is the legacy behavior that is now deprecated.
 *
 * Once you have migrated all relationships, you can remove the the resetOnRemoteUpdate
 * option and set the deprecation flag to false in ember-cli-build.
 *
 * ### What if I don't want the new behavior?
 *
 * EmberData's philosophy is to not make assumptions about your application. Where possible
 * we seek out "100%" solutions – solutions that work for all use cases - and where that is
 * not possible we default to "90%" solutions – solutions that work for the vast majority of use
 * cases. In the case of "90%" solutions we look for primitives that allow you to resolve the
 * 10% case in your application. If no such primitives exist, we provide an escape hatch that
 * ensures you can build the behavior you need without adopting the cost of the default solution.
 *
 * In this case, the old behavior was a "40%" solution. The inability for an application developer
 * to determine what changes were made locally, and thus what changes should be preserved, made
 * it impossible to build certain features easily, or in some cases at all. The proliferation of
 * feature requests, bug reports (from folks surprised by the prior behavior) and addon attempts
 * in this space are all evidence of this.
 *
 * We believe the new behavior is a "90%" solution. It works for the vast majority of use cases,
 * often without noticeable changes to existing application behavior, and provides primitives that
 * allow you to build the behavior you need for the remaining 10%.
 *
 * The great news is that this behavior defaults to trusting your API similar to the old behavior.
 * If your API is correct, you will not need to make any changes to your application to adopt
 * the new behavior.
 *
 * This means the 10% cases are those where you can't trust your API to provide the correct
 * information. In these cases, because you now have cheap access to a diff of the relationship
 * state, there are a few options that weren't available before:
 *
 * - you can adjust returned API payloads to contain the expected changes that it doesn't include
 * - you can modify local state by adding or removing records on the HasMany record array to remove
 *   any local changes that were not returned by the API.
 * - you can use `<Cache>.mutate(mutation)` to directly modify the local cache state of the relationship
 *   to match the expected state.
 *
 * What this version (5.3) does not yet provide is a way to directly modify the cache's remote state
 * for the relationship via public APIs other than via the broader action of upserting a response via
 * `<Cache>.put(document)`. However, such an API was sketched in the Cache 2.1 RFC
 * `<Cache>.patch(operation)` and is likely to be added in a future 5.x release of EmberData.
 *
 * This version (5.3) also does not yet provide a way to directly modify the graph (a general purpose
 * subset of cache behaviors specific to relationships) via public APIs. However, during the
 * 5.x release series we will be working on finalizing the Graph API and making it public.
 *
 * If none of these options work for you, you can always opt-out more broadly by implementing
 * a custom Cache with the relationship behaviors you need.
 *
 * @property DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE = '5.3';

/**
 * **id: ember-data:deprecate-store-extends-ember-object**
 *
 * When the flag is `true` (default), the Store class will extend from `@ember/object`.
 * When the flag is `false` or `ember-source` is not present, the Store will not extend
 * from EmberObject.
 *
 * @property DEPRECATE_STORE_EXTENDS_EMBER_OBJECT
 * @since 5.4
 * @until 6.0
 * @public
 */
export const DEPRECATE_STORE_EXTENDS_EMBER_OBJECT = '5.4';

/**
 * **id: ember-data:schema-service-updates**
 *
 * When the flag is `true` (default), the legacy schema
 * service features will be enabled on the store and
 * the service, and deprecations will be thrown when
 * they are used.
 *
 * Deprecated features include:
 *
 * - `Store.registerSchema` method is deprecated in favor of the `Store.createSchemaService` hook
 * - `Store.registerSchemaDefinitionService` method is deprecated in favor of the `Store.createSchemaService` hook
 * - `Store.getSchemaDefinitionService` method is deprecated in favor of `Store.schema` property
 * - `SchemaService.doesTypeExist` method is deprecated in favor of the `SchemaService.hasResource` method
 * - `SchemaService.attributesDefinitionFor` method is deprecated in favor of the `SchemaService.fields` method
 * - `SchemaService.relationshipsDefinitionFor` method is deprecated in favor of the `SchemaService.fields` method
 *
 * @property ENABLE_LEGACY_SCHEMA_SERVICE
 * @since 5.4
 * @until 6.0
 * @public
 */
export const ENABLE_LEGACY_SCHEMA_SERVICE = '5.4';

/**
 * **id: warp-drive.ember-inflector**
 *
 * Deprecates the use of ember-inflector for pluralization and singularization in favor
 * of the `@ember-data/request-utils` package.
 *
 * Rule configuration methods (singular, plural, uncountable, irregular) and
 * usage methods (singularize, pluralize) are are available as imports from
 * `@ember-data/request-utils/string`
 *
 * Notable differences with ember-inflector:
 * - there cannot be multiple inflector instances with separate rules
 * - pluralization does not support a count argument
 * - string caches now default to 10k entries instead of 1k, and this
 *   size is now configurable. Additionally, the cache is now a LRU cache
 *   instead of a first-N cache.
 *
 * This deprecation can be resolved by removing usage of ember-inflector or by using
 * both ember-inflector and @ember-data/request-utils in parallel and updating your
 * EmberData/WarpDrive build config to mark the deprecation as resolved
 * in ember-cli-build
 *
 * ```js
 * setConfig(app, __dirname, { deprecations: { DEPRECATE_EMBER_INFLECTOR: false }});
 * ```
 *
 * @property DEPRECATE_EMBER_INFLECTOR
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_EMBER_INFLECTOR = '5.3';

/**
 * This is a special flag that can be used to opt-in early to receiving deprecations introduced in 5.x
 * which have had their infra backported to 4.x versions of EmberData.
 *
 * When this flag is not present or set to `true`, the deprecations from the 5.x branch
 * will not print their messages and the deprecation cannot be resolved.
 *
 * When this flag is present and set to `false`, the deprecations from the 5.x branch will
 * print and can be resolved.
 *
 * @property DISABLE_6X_DEPRECATIONS
 * @since 4.13
 * @until 5.0
 * @public
 */
export const DISABLE_6X_DEPRECATIONS = '6.0';
