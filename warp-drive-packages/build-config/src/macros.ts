/**
 * Internal functions for instrumenting the library's code with behaviors
 * that are removed from production builds.
 *
 * @hidden
 * @module
 */

/**
 * A type-narrowing assertion function that throws an error with the supplied
 * message if the condition is falsy.
 *
 * Asserts are removed from production builds, making this a "zero cost abstraction"
 * so liberal usage of this function to ensure runtime correctness is encouraged.
 *
 * @private
 */
export function assert(message: string, condition: unknown): asserts condition;
export function assert(message: string): never;
export function assert(message: string, condition?: unknown): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
