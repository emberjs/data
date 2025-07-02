/**
 *
 * # Canary Features <Badge type="warning" text="requires canary" />
 *
 * ***Warp*Drive** allows users to test upcoming features that are implemented
 * but not yet activated in canary builds.
 *
 * Typically these features represent work that carries higher risk of breaking
 * changes, or are not yet fully ready for production use.
 *
 * Such features have their implementations guarded by a "feature flag", and the
 * flag is only activated once the core-data team is prepared to ship the work
 * in a canary release, beginning the process of it landing in a stable release.
 *
 * ### Installing Canary
 *
 * ::: warning To test a feature guarded behind a flag, you MUST be using a canary build.
 * :::
 *
 * Canary builds are published to `npm` and can be installed using a precise tag
 * (such as `@warp-drive/core@5.6.0-alpha.1`) or by installing the latest dist-tag
 * published to the `canary` channel.
 *
 * Because ***Warp*Drive** packages operate on a strict lockstep policy with each other,
 * you must install the matching canary version of all ***Warp*Drive** packages.
 *
 * Below is an example of installing the latest canary version of all the core
 * packages that are part of the ***Warp*Drive** project when using EmberJS.
 *
 * Add/remove packages from this list to match your project.
 *
 * ::: code-group
 *
 * ```sh [pnpm]
 * pnpm add -E @warp-drive/core@canary \
 *   @warp-drive/json-api@canary \
 *   @warp-drive/ember@canary;
 * ```
 *
 * ```sh [npm]
 * npm add -E @warp-drive/core@canary \
 *   @warp-drive/json-api@canary \
 *   @warp-drive/ember@canary;
 * ```
 *
 * ```sh [yarn]
 * yarn add -E @warp-drive/core@canary \
 *   @warp-drive/json-api@canary \
 *   @warp-drive/ember@canary;
 * ```
 *
 * ```sh [bun]
 * bun add --exact @warp-drive/core@canary \
 *   @warp-drive/json-api@canary \
 *   @warp-drive/ember@canary;
 * ```
 *
 * :::
 *
 * ### Activating a Feature
 *
 * Once you have installed canary, feature-flags can be activated at build-time
 *
 * ```ts
 * setConfig(app, __dirname, {
 *   features: {
 *     FEATURE_A: false, // utilize existing behavior
 *     FEATURE_B: true // utilize the new behavior
 *   }
 * })
 * ```
 *
 * by setting an environment variable:
 *
 * ```sh
 * # Activate a single flag
 * export WARP_DRIVE_FEATURE_OVERRIDE=SOME_FLAG;
 *
 * # Activate multiple flags by separating with commas
 * export WARP_DRIVE_FEATURE_OVERRIDE=SOME_FLAG,OTHER_FLAG;
 *
 * # Activate all flags
 * export WARP_DRIVE_FEATURE_OVERRIDE=ENABLE_ALL_OPTIONAL;
 * ```
 *
 * ::: warning To test a feature guarded behind a flag, you MUST be running a development build.
 * :::
 *
 *
 * ### Preparing a Project to use a Canary Feature
 *
 * For most projects and features, simple version detection should be enough.
 *
 * Using the provided version compatibility helpers from [embroider-macros](https://github.com/embroider-build/embroider/tree/main/packages/macros#readme)
 * the following can be done:
 *
 * ```js
 * if (macroCondition(dependencySatisfies('@warp-drive/core', '5.6'))) {
 *   // do thing
 * }
 * ```
 *
 * For more complex projects and migrations, configure [@warp-drive/build-config/babel-macros](./babel-macros)
 *
 * The current list of features used at build time for canary releases is defined below.
 *
 * ::: tip 💡 If empty there are no features currently gated by feature flags.
 * :::
 *
 * The valid values are:
 *
 *  - `true` | The feature is **enabled** at all times, and cannot be disabled.
 *  - `false` | The feature is **disabled** at all times, and cannot be enabled.
 *  - `null` | The feature is **disabled by default**, but can be enabled via configuration.
 *
 * @module
 * @public
 */

/**
 * We use this for some tests etc.
 *
 * @internal
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
 * @since 5.4
 * @public
 */
export const JSON_API_CACHE_VALIDATION_ERRORS: boolean | null = false;

/**
 * This upcoming feature adds a validation step when `schema.fields({ type })`
 * is called for the first time for a resource.
 *
 * When active, if any trait specified by the resource or one of its traits is
 * missing an error will be thrown in development.
 *
 * @since 5.7
 * @public
 */
export const ENFORCE_STRICT_RESOURCE_FINALIZATION: boolean | null = false;
