import { isDocument } from './-target.ts';

/**
  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is a select element, `false` otherwise
*/
export default function isSelectElement(element: Element | Document): element is HTMLSelectElement {
  return !isDocument(element) && element.tagName === 'SELECT';
}
