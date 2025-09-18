import { getElement } from './-get-element.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';

// Derived from `querySelector` types.
export function find<K extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
  selector: K
): HTMLElementTagNameMap[K] | SVGElementTagNameMap[K] | null;
export function find<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
export function find<K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
export function find(selector: string): Element | null;
/**
  Find the first element matched by the given selector. Equivalent to calling
  `querySelector()` on the test root element.

  @public
  @param {string} selector the selector to search for
  @return {Element | null} matched element or null

  @example
  <caption>
    Finding the first element with id 'foo'
  </caption>
  find('#foo');
*/
export function find<T extends HelperContext>(this: T, selector: string): Element | null {
  if (!selector) {
    throw new Error('Must pass a selector to `find`.');
  }

  if (arguments.length > 1) {
    throw new Error('The `find` test helper only takes a single argument.');
  }

  assertRenderContext(this);
  return getElement(selector, this.element);
}
