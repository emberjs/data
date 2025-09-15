import { getElement } from './-get-element.ts';
import { isWindow, type Target } from './-target.ts';

/**
  Used internally by the DOM interaction helpers to find either window or an element.

  @private
  @param target the window, an element or selector to retrieve
*/
export function getWindowOrElement(target: Target, rootElement: HTMLElement): Element | Document | Window | null {
  if (isWindow(target)) {
    return target;
  }

  return getElement(target, rootElement);
}
