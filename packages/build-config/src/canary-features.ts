/**
 *
 * @module @warp-drive/build-config
 */

/**
 *
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
 * or by installing the latest dist-tag published to the `canary` channel using your javascript
 * package manager of choice. For instance with [pnpm](https://pnpm.io/)

  ```cli
  pnpm add ember-data@canary
  ```
 *
 * ### Activating a Canary Feature
 *
 * Once you have installed canary, feature-flags can be activated at build-time
 *
 * by setting an environment variable:
 *
 * ```cli
 * # Activate a single flag
 * WARP_DRIVE_FEATURE_OVERRIDE=SOME_FLAG ember build
 *
 * # Activate multiple flags by separating with commas
 * WARP_DRIVE_FEATURE_OVERRIDE=SOME_FLAG,OTHER_FLAG ember build
 *
 * # Activate all flags
 * WARP_DRIVE_FEATURE_OVERRIDE=ENABLE_ALL_OPTIONAL ember build
 * ```
 *
 * or by setting the appropriate flag in your `ember-cli-build` file:
 *
 * ```ts
 * setConfig(app, __dirname, {
 *   features: {
 *     SAMPLE_FEATURE_FLAG: false // utliize existing behavior, strip code for the new feature
 *     OTHER_FEATURE_FLAG: true // utilize this new feature, strip code for the older behavior
 *   }
 * })
 * ```
 *
 * **The "off" branch of feature-flagged code is always stripped from production builds.**
 *
 * The list of available feature-flags is located [here](https://github.com/emberjs/data/tree/main/packages/build-config/src/virtual/canary-features.ts "List of EmberData FeatureFlags")
 *
 *
 * ### Preparing a Project to use a Canary Feature
 *
 * For most projects, simple version detection should be enough.
 * Using the provided version compatibility helpers from [embroider-macros](https://github.com/embroider-build/embroider/tree/main/packages/macros#readme)
 * the following can be done:
 *
 * ```js
 * if (macroCondition(dependencySatisfies('@ember-data/store', '5.0'))) {
 *   // do thing
 * }
 * ```
 *
 * The current list of features used at build time for canary releases is defined below.
 * If empty there are no features currently gated by feature flags.
 *
 * The valid values are:
 *
 *  - `true` | The feature is **enabled** at all times, and cannot be disabled.
 *  - `false` | The feature is **disabled** at all times, and cannot be enabled.
 *  - `null` | The feature is **disabled by default**, but can be enabled via configuration.
 *
 * @class CanaryFeatures
 * @public
*/
export const SAMPLE_FEATURE_FLAG: boolean | null = null;

/**
 * This upcoming feature adds a validation step to payloads received
 * by the JSONAPICache implementation.
 *
 * When a request completes and the result is given to the cache via
 * `cache.put`, the cache will validate the payload against registered
 * schemas as well as the JSON:API spec.
 *
 * @property JSON_API_CACHE_VALIDATION_ERRORS
 * @type {Boolean|null}
 * @since 5.4
 * @public
 */
export const JSON_API_CACHE_VALIDATION_ERRORS: boolean | null = false;
