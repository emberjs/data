import { isDescriptor, lookupDescriptorData } from 'dom-element-descriptors';

import type { Target } from './-target';

/**
  Used internally by the DOM interaction helpers to get a description of a
  target for debug/error messaging.

  @private
  @param {Target} target the target
  @returns {string} a description of the target
*/
export default function getDescription(target: Target): string {
  const data = isDescriptor(target) ? lookupDescriptorData(target) : null;
  if (data) {
    return data.description || '<unknown descriptor>';
  } else {
    return `${String(target)}`;
  }
}
