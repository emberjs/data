import { assign, merge } from '@ember/polyfills';
import { isEqual } from '@ember/utils';

const emberAssign = assign || merge;

export default function changedKeys(data, attributes, inFlightAttributes, updates) {
  let changedKeys = [];

  if (updates) {
    let original, i, value, key;
    let keys = Object.keys(updates);
    let length = keys.length;
    let hasAttrs = attributes !== null && Object.keys(attributes).length > 0;

    original = emberAssign(Object.create(null), data);
    original = emberAssign(original, inFlightAttributes);

    for (i = 0; i < length; i++) {
      key = keys[i];
      value = updates[key];

      // A value in _attributes means the user has a local change to
      // this attributes. We never override this value when merging
      // updates from the backend so we should not sent a change
      // notification if the server value differs from the original.
      if (hasAttrs === true && attributes[key] !== undefined) {
        continue;
      }

      if (!isEqual(original[key], value)) {
        changedKeys.push(key);
      }
    }
  }

  return changedKeys;
}
