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
  DEPRECATE_EVENTED_API_USAGE: '3.12',
  DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS: '3.12',
  DEPRECATE_MODEL_TOJSON: '3.15',
  DEPRECATE_LEGACY_TEST_HELPER_SUPPORT: '3.15',
  DEPRECATE_LEGACY_TEST_REGISTRATIONS: '3.15',
  DEPRECATE_DEFAULT_SERIALIZER: '3.15',
  DEPRECATE_DEFAULT_ADAPTER: '3.15',
  DEPRECATE_METHOD_CALLS_ON_DESTROY_STORE: '3.15',
  DEPRECATE_MISMATCHED_INVERSE_RELATIONSHIP_DATA: '3.12',
  DEPRECATE_BELONGS_TO_REFERENCE_PUSH: '3.16',
  DEPRECATE_REFERENCE_INTERNAL_MODEL: '3.19',
  DEPRECATE_NAJAX: '3.22',
};
