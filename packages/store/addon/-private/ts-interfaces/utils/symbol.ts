/**
  @module @ember-data/store
*/

/**
 * This symbol provides a Symbol replacement for browsers that do not have it
 * (eg. IE 11).
 *
 * The replacement is different from the native Symbol in some ways. It is a
 * function that produces an output:
 * - iterable;
 * - that is a string, not a symbol.
 *
 * @internal
 */
export const symbol =
  typeof Symbol !== 'undefined'
    ? Symbol
    : (key: string) => `__${key}${Math.floor(Math.random() * Date.now())}__` as any;
