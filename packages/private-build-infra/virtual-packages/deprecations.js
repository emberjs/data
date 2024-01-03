//
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
 * **id: <none yet assigned>**
 *
 * This is a planned deprecation which will trigger when observer or computed
 * chains are used to watch for changes on any EmberData RecordArray, ManyArray
 * or PromiseManyArray.
 *
 * Support for these chains is currently guarded by the deprecation flag
 * listed here, enabling removal of the behavior if desired.
 *
 * @property DEPRECATE_COMPUTED_CHAINS
 * @since 5.0
 * @until 6.0
 * @public
 */
export const DEPRECATE_COMPUTED_CHAINS = '5.0';

/**
 * **id: ember-data:deprecate-legacy-imports**
 *
 * Deprecates when importing from `ember-data/*` instead of `@ember-data/*`
 * in order to prepare for the eventual removal of the legacy `ember-data/*`
 *
 * All imports from `ember-data/*` should be updated to `@ember-data/*`
 * except for `ember-data/store`. When you are using `ember-data` (as opposed to
 * installing the indivudal packages) you should import from `ember-data/store`
 * instead of `@ember-data/store` in order to receive the appropriate configuration
 * of defaults.
 *
 * @property DEPRECATE_LEGACY_IMPORTS
 * @since 5.3
 * @until 6.0
 * @public
 */
export const DEPRECATE_LEGACY_IMPORTS = '5.3';

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
 * let app = new EmberApp(defaults, {
 *   emberData: {
 *     deprecations: {
 *        // set to false to strip the deprecated code (thereby opting into the new behavior)
 *       DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE: false
 *     }
 *   }
 * })
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
export const DEPRECATE_MANY_ARRAY_DUPLICATES = '5.3';
