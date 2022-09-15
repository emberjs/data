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
 * The complete list of which versions specific deprecations will be removed in
 * can be found [here](https://github.com/emberjs/data/tree/master/packages/private-build-infra/addon/current-deprecations.ts "List of EmberData Deprecations")
 *
 * @module @ember-data/deprecations
 * @main @ember-data/deprecations
 */
export default {
  DEPRECATE_CATCH_ALL: '99.0',
  DEPRECATE_3_12: '3.12',
  DEPRECATE_RSVP_PROMISE: '4.4',
  DEPRECATE_SAVE_PROMISE_ACCESS: '4.4',
  DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS: '4.5',
  DEPRECATE_STORE_FIND: '4.5',
  DEPRECATE_HAS_RECORD: '4.5',
  DEPRECATE_STRING_ARG_SCHEMAS: '4.5',
  DEPRECATE_JSON_API_FALLBACK: '4.5',
  DEPRECATE_MODEL_REOPEN: '4.7',
  DEPRECATE_EARLY_STATIC: '4.7',
  DEPRECATE_CLASSIC: '4.9',
  DEPRECATE_HELPERS: '4.7',
  DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS: '4.7',
  DEPRECATE_V1CACHE_STORE_APIS: '4.7',
  DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE: '4.7',
  DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC: '4.7',
  DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE: '4.7',
  DEPRECATE_V1_RECORD_DATA: '4.7',
  DEPRECATE_A_USAGE: '4.7',
  DEPRECATE_PROMISE_PROXIES: '4.7',
  DEPRECATE_ARRAY_LIKE: '4.7',
  DEPRECATE_COMPUTED_CHAINS: '4.7',
  DEPRECATE_NON_EXPLICIT_POLYMORPHISM: '4.7',
};
