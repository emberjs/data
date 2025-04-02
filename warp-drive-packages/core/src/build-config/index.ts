/**
 * Settings configuration for deprecations, optional features, development/testing
 * support and debug logging is done using `setConfig` in `ember-cli-build`.
 *
 * ```ts
 * 'use strict';
 *
 * const EmberApp = require('ember-cli/lib/broccoli/ember-app');
 *
 * module.exports = async function (defaults) {
 *   const { setConfig } = await import('@warp-drive/core/build-config');
 *
 *   const app = new EmberApp(defaults, {});
 *
 *   setConfig(app, __dirname, {
 *     // settings here
 *   });
 *
 *   const { Webpack } = require('@embroider/webpack');
 *   return require('@embroider/compat').compatBuild(app, Webpack, {});
 * };
 *
 * ```
 *
 * Available settings include:
 *
 * - [Debug Logging](../classes/DebugLogging)
 * - [Deprecated Code Removal](../classes/CurrentDeprecations)
 * - [Canary Feature Activation](../classes/CanaryFeatures)
 *
 * As well as:
 *
 * ### polyfillUUID
 *
 * If you are using the library in an environment that does not support `window.crypto.randomUUID`
 * you can enable a polyfill for it.
 *
 * ```ts
 * setConfig(app, __dirname, {
 *  polyfillUUID: true
 * });
 * ```
 *
 * ### includeDataAdapterInProduction
 *
 * By default, the integration required to support the ember inspector browser extension
 * is included in production builds only when using the `ember-data` package. Otherwise
 * the default is to exclude it. This setting allows to explicitly enable/disable it in
 * production builds.
 *
 * ```ts
 * setConfig(app, __dirname, {
 *   includeDataAdapterInProduction: true
 * });
 * ```
 *
 * @module @warp-drive/core/build-config
 * @main @warp-drive/core/build-config
 */

export { setConfig, type WarpDriveConfig } from '@warp-drive/build-config';
