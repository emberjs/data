import getElements from './-get-elements.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';

// Derived, with modification, from the types for `querySelectorAll`. These
// would simply be defined as a tweaked re-export as `querySelector` is, but it
// is non-trivial (to say the least!) to preserve overloads like this while also
// changing the return type (from `NodeListOf` to `Array`).
export function findAll<K extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
  selector: K
): Array<HTMLElementTagNameMap[K] | SVGElementTagNameMap[K]>;
export function findAll<K extends keyof HTMLElementTagNameMap>(selector: K): Array<HTMLElementTagNameMap[K]>;
export function findAll<K extends keyof SVGElementTagNameMap>(selector: K): Array<SVGElementTagNameMap[K]>;
export function findAll(selector: string): Element[];
/**
  Find all elements matched by the given selector. Similar to calling
  `querySelectorAll()` on the test root element, but returns an array instead
  of a `NodeList`.

  @public
  @param {string} selector the selector to search for
  @return {Array} array of matched elements

  @example
  <caption>
    Find all of the elements matching '.my-selector'.
  </caption>
  findAll('.my-selector');
*/
export function findAll<T extends HelperContext>(this: T, selector: string): Element[] {
  if (!selector) {
    throw new Error('Must pass a selector to `findAll`.');
  }

  if (arguments.length > 1) {
    throw new Error('The `findAll` test helper only takes a single argument.');
  }

  assertRenderContext(this);
  return Array.from(getElements(selector, this.element));
}
