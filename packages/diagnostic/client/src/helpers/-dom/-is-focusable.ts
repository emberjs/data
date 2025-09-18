import isFormControl from './-is-form-control.ts';
import { isContentEditable, isDocument, isWindow } from './-target.ts';

// For reference:
// https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute
const FOCUSABLE_TAGS = ['A', 'SUMMARY'];

type FocusableElement = HTMLAnchorElement;

function isFocusableElement(element: Element): element is FocusableElement {
  return FOCUSABLE_TAGS.includes(element.tagName);
}

/**
  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is focusable, `false` otherwise
*/
export default function isFocusable(
  element: HTMLElement | SVGElement | Element | Document | Window
): element is HTMLElement | SVGElement {
  if (isWindow(element)) {
    return false;
  }

  if (isDocument(element)) {
    return false;
  }

  if (isFormControl(element)) {
    return !element.disabled;
  }

  if (isContentEditable(element) || isFocusableElement(element)) {
    return true;
  }

  return element.hasAttribute('tabindex');
}
