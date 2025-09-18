import type { IDOMElementDescriptor } from 'dom-element-descriptors';

export type Target = string | Element | IDOMElementDescriptor | Document | Window;

export interface HTMLElementContentEditable extends HTMLElement {
  isContentEditable: true;
}

export function isElement(target: unknown): target is Element {
  return target !== null && typeof target === 'object' && Reflect.get(target, 'nodeType') === Node.ELEMENT_NODE;
}

export function isWindow(target: Target): target is Window {
  return target instanceof Window;
}

export function isDocument(target: unknown): target is Document {
  return target !== null && typeof target === 'object' && Reflect.get(target, 'nodeType') === Node.DOCUMENT_NODE;
}

export function isContentEditable(element: Element): element is HTMLElementContentEditable {
  return 'isContentEditable' in element && (element as HTMLElement).isContentEditable;
}
