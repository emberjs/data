/**
 * Provides a configuration API for the reactivity system
 * that WarpDrive should use.
 *
 * @module
 */
/**
 * Configures the signals implementation to use. Supports multiple
 * implementations simultaneously.
 *
 * @public
 * @param {function} buildConfig - a function that takes options and returns a configuration object
 */
export { setupSignals } from './-private/new-core-tmp/reactivity/configure';
