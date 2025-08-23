/* globals Promise */

import isFormControl from './-is-form-control.ts';

export const nextTick = (cb: () => void): Promise<void> => Promise.resolve().then(cb);
export const futureTick: typeof setTimeout = setTimeout;

/**
 Returns whether the passed in string consists only of numeric characters.

 @private
 @param {string} n input string
 @returns {boolean} whether the input string consists only of numeric characters
 */
export function isNumeric(n: string): boolean {
  return !isNaN(parseFloat(n)) && isFinite(Number(n));
}

/**
  Checks if an element is considered visible by the focus area spec.

  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is visible, `false` otherwise
*/
export function isVisible(element: Element): boolean {
  const styles = window.getComputedStyle(element);
  return styles.display !== 'none' && styles.visibility !== 'hidden';
}

/**
  Checks if an element is disabled.

  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is disabled, `false` otherwise
*/
export function isDisabled(element: HTMLElement): boolean {
  if (isFormControl(element)) {
    return (element as HTMLInputElement).disabled;
  }
  return false;
}
