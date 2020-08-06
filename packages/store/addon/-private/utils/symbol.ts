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

export function addSymbol(obj: object, symbol: Symbol | string, value: any): void {
  if (typeof symbol === 'string') {
    Object.defineProperty(obj, symbol, {
      value,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  } else {
    // Typescript doesn't allow Symbol as an index type
    obj[(symbol as unknown) as string] = value;
  }
}
