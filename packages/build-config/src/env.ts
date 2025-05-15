/**
 * Internal constants for instrumenting the library's code for different environments.
 *
 * @hidden
 * @module
 */

/**
 * a `boolean` indicating whether the code is running in a **development environment**
 * which is converted into a [macroCondition](https://www.npmjs.com/package/@embroider/macros#the-macros) during the package's build process.
 *
 * code within a branch where `DEBUG === true` will be removed from **production** builds
 * while code within a branch where `DEBUG === false` will be removed from **development** builds
 *
 * ```ts
 * if (DEBUG) {
 *   // debug code
 * } else {
 *   // production code
 * }
 * ```
 *
 * This constant may be used in ternary expressions but should not be
 * otherwised used as a value.
 *
 * Negating the value is supported.
 *
 * ```ts
 * if (!DEBUG) {
 *   // production code
 * } else {
 *   // debug code
 * }
 * ```
 *
 * @internal
 */
export const DEBUG: boolean = true;
/**
 * a `boolean` indicating whether the code is running in a **production environment**
 * which is converted into a [macroCondition](https://www.npmjs.com/package/@embroider/macros#the-macros) during the package's build process.
 *
 * code within a branch where `PRODUCTION === true` will be removed from **development** builds
 * while code within a branch where `PRODUCTION === false` will be removed from **production** builds
 *
 * ```ts
 * if (PRODUCTION) {
 *  // production code
 * } else {
 *   // debug code
 * }
 * ```
 *
 * This constant may be used in ternary expressions but should not be
 * otherwised used as a value.
 *
 * Negating the value is supported.
 *
 * ```ts
 * if (!PRODUCTION) {
 *  // debug code
 * } else {
 *  // production code
 * }
 * ```
 *
 * @internal
 */
export const PRODUCTION: boolean = true;
/**
 * a `boolean` indicating whether the code is running in a **testing environment**
 * which is converted into a [macroCondition](https://www.npmjs.com/package/@embroider/macros#the-macros) during the package's build process.
 *
 * TESTING can be true for both development and production builds, it is always true
 * in a development build, and also true when any of the following ENV variables are set:
 *
 * - `EMBER_ENV === 'test'`
 * - `IS_TESTING`
 * - `EMBER_CLI_TEST_COMMAND`
 *
 * ```ts
 * if (TESTING) {
 *   // test env code
 * } else {
 *   // non-test env code
 * }
 * ```
 *
 * Like DEBUG and PRODUCTION, this constant is converted into a macro during the package's
 * build process, and code within the `false` branch will be removed from the build output.
 *
 * This constant may be used in ternary expressions but should not be
 * otherwised used as a value.
 *
 * Negating the value is supported.
 *
 * ```ts
 * if (!TESTING) {
 *   // production code
 * } else {
 *   // testing code
 * }
 * ```
 *
 * @internal
 */
export const TESTING: boolean = true;
/**
 * Indicates whether Holodeck is in a forced global recording mode.
 *
 * @internal
 */
export const IS_RECORDING: boolean = true;
/**
 * Indicates whether the code is running in a CI environment.
 *
 * This is determined by the presence of the `CI` environment variable.
 *
 * @internal
 */
export const IS_CI: boolean = true;
/**
 * Indicates whether holodeck should record the current test run.
 *
 * This is always true in a non-CI environment, and is true if
 * `IS_RECORDING` is true.
 *
 * @internal
 */
export const SHOULD_RECORD: boolean = true;
