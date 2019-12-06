/**
 * ## Canary Features
 *
 * EmberData allows users to test features that are implemented but not yet
 * available even in canary.
 *
 * Typically these features represent work that might introduce a new concept,
 * new API, change an API, or risk an unintended change in behavior to consuming
 * applications.
 *
 * Such features have their implementations guarded by a "feature flag", and the
 * flag is only activated once the core-data team is prepared to ship the work
 * in a canary release.
 *
 * ### Installing Canary
 *
 * To test a feature you MUST be using a canary build. Canary builds are published
 * to `npm` and can be installed using a precise tag (such as `ember-data@3.16.0-alpha.1`)
 * or by installing the latest dist-tag published to the `canary` channel.
 *
 * *Using `npm` to install the latest canary*
 *
 * ```cli
 * npm install --save-dev ember-data@canary
 * ```
 *
 * *Using `yarn` to install the latest canary*
 *
 * ```cli
 * yarn add ember-data@canary
 * ```
 *
 * ### Activating a Canary Feature
 *
 * Once you have installed canary, feature-flags can be activated at build-time by an environment
 * variable or at runtime using `window.EmberDataENV`.
 *
 * The "off" branch of feature-flagged code is always stripped from production builds, so you
 * MUST use the build-time environment variable to activate a flag if testing production.
 *
 * The list of available feature-flags is located [here](https://github.com/emberjs/data/tree/master/packages/canary-features/addon/default-features.ts "List of EmberData FeatureFlags")
 *
 * #### Runtime Configuration
 *
 * To configure feature-flags at runtime you will want to configure `window.EmberDataENV = {}` appropriately.
 * You should add this global property in your app prior to your application booting. At the top of
 * your `app.js` file is a convenient location, as is within ` index.html` as a script running prior
 * to loading any other scripts.
 *
 * *Example activating a single feature flags*
 *
 * ```js
 * window.EmberDataENV = {
 *   FEATURES: {
 *     RECORD_DATA_ERRORS: true,
 *   }
 * }
 * ```
 *
 * *Example activating multiple feature flags*
 *
 * ```js
 * window.EmberDataENV = {
 *   FEATURES: {
 *     RECORD_DATA_ERRORS: true,
 *     RECORD_DATA_STATE: true,
 *   }
 * }
 * ```
 *
 * *Example activating all feature flags*
 *
 * ```js
 * window.EmberDataENV = {
 *   ENABLE_OPTIONAL_FEATURES: true
 * }
 * ```
 *
 * #### Build Time Configuration
 *
 * *Example activating a single feature flags*
 *
 * ```js
 * EMBER_DATA_FEATURE_OVERRIDE=REQUEST_SERVICE ember build
 * ```
 *
 * *Example activating multiple feature flags*
 *
 * ```js
 * EMBER_DATA_FEATURE_OVERRIDE=REQUEST_SERVICE,CUSTOM_MODEL_CLASS ember build
 * ```
 *
 * *Example activating all feature flags*
 *
 * ```js
 * EMBER_DATA_FEATURE_OVERRIDE=ENABLE_ALL_OPTIONAL ember build
 * ```
 *
 * ### Preparing an Addon to use a Canary Feature
 *
 * @module @ember-data/canary-features
 * @main @ember-data/canary-features
 */
/*
  This list of features is used both at build time (by `@ember-data/private-build-infra`)
  and at runtime (by `@ember-data/canary-features`).

  The valid values are:

  - true - The feature is enabled at all times, and cannot be disabled.
  - false - The feature is disabled at all times, and cannot be enabled.
  - null - The feature is disabled by default, but can be enabled at runtime via `EmberDataENV`.
*/
export default {
  SAMPLE_FEATURE_FLAG: null,
  RECORD_DATA_ERRORS: null,
  RECORD_DATA_STATE: null,
  IDENTIFIERS: true,
  REQUEST_SERVICE: null,
  CUSTOM_MODEL_CLASS: null,
  FULL_LINKS_ON_RELATIONSHIPS: null,
};
