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
