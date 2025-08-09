import { type IDOMElementDescriptor, lookupDescriptorData, resolveDOMElement } from 'dom-element-descriptors';

import { isDocument, isElement, type Target } from './-target.ts';

function getElement<K extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
  target: K,
  rootElement: HTMLElement
): (HTMLElementTagNameMap[K] | SVGElementTagNameMap[K]) | null;
function getElement<K extends keyof HTMLElementTagNameMap>(
  target: K,
  rootElement: HTMLElement
): HTMLElementTagNameMap[K] | null;
function getElement<K extends keyof SVGElementTagNameMap>(
  target: K,
  rootElement: HTMLElement
): SVGElementTagNameMap[K] | null;
function getElement(target: string, rootElement: HTMLElement): Element | null;
function getElement(target: Element, rootElement: HTMLElement): Element;
function getElement(target: IDOMElementDescriptor, rootElement: HTMLElement): Element | null;
function getElement(target: Document, rootElement: HTMLElement): Document;
function getElement(target: Window, rootElement: HTMLElement): Document;
function getElement(target: string | IDOMElementDescriptor, rootElement: HTMLElement): Element | null;
function getElement(target: Target, rootElement: HTMLElement): Element | Document | null;
function getElement(target: Target, rootElement: HTMLElement): Element | Document | null {
  if (typeof target === 'string') {
    return rootElement.querySelector(target);
  } else if (isElement(target) || isDocument(target)) {
    return target;
  } else if (target instanceof Window) {
    return target.document;
  } else {
    const descriptorData = lookupDescriptorData(target);
    if (descriptorData) {
      return resolveDOMElement(descriptorData);
    } else {
      throw new Error('Must use an element, selector string, or DOM element descriptor');
    }
  }
}

export { getElement };
