import { type IDOMElementDescriptor, lookupDescriptorData, resolveDOMElements } from 'dom-element-descriptors';

function getElements(target: string, rootElement: HTMLElement): NodeListOf<Element>;
function getElements(target: IDOMElementDescriptor, rootElement: HTMLElement): Iterable<Element>;
function getElements(target: string | IDOMElementDescriptor, rootElement: HTMLElement): Iterable<Element>;
/**
  Used internally by the DOM interaction helpers to find multiple elements.

  @private
  @param {string} target the selector to retrieve
  @returns {NodeList} the matched elements
*/
function getElements(
  target: string | IDOMElementDescriptor,
  rootElement: HTMLElement
): NodeListOf<Element> | Iterable<Element> {
  if (typeof target === 'string') {
    return rootElement.querySelectorAll(target);
  } else {
    const descriptorData = lookupDescriptorData(target);
    if (descriptorData) {
      return resolveDOMElements(descriptorData);
    } else {
      throw new Error('Must use a selector string or DOM element descriptor');
    }
  }
}

export default getElements;
