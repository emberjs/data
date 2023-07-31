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
 * @since 5.2
 * @until 6.0
 * @public
 */
export const DEPRECATE_NON_STRICT_TYPES = '5.2';

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
 * @since 5.2
 * @until 6.0
 * @public
 */
export const DEPRECATE_NON_STRICT_ID = '5.2';

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
 * @since 5.2
 * @until 6.0
 * @public
 */
export const DEPRECATE_LEGACY_IMPORTS = '5.2';

/* PLANNED
 * **id: ember-data:deprecate-non-unique-collection-payloads**
 *
 * Deprecates when the data for a hasMany relationship contains
 * duplicate identifiers.
 *
 * @property DEPRECATE_NON_UNIQUE_PAYLOADS
 * @since 5.2
 * @until 6.0
 * @public
 */
export const DEPRECATE_NON_UNIQUE_PAYLOADS = '5.2';
