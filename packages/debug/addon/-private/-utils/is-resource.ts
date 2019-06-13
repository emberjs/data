import isPlainObject from './is-plain-object';
import memberPresent from './member-present';

export const ID_KEYS = ['type', 'id'];
export const ALLOWED_KEYS = ['meta'];
export const RESOURCE_KEYS = ['links', 'attributes', 'relationships'];
export const ALL_RESOURCE_KEYS = [].concat(ID_KEYS, ALLOWED_KEYS, RESOURCE_KEYS);

/**
 * Loosely determine if an object might be a resource
 *
 * unknown keys and undefined keys are allowed through, this just validates
 * that `type` `id` AND one of `attributes` `links` or `relationship` is
 * present on the object even if set to `undefined`
 *
 * @param resource
 * @returns {boolean}
 */
export default function isResource(resource) {
  if (!isPlainObject(resource)) {
    return false;
  }

  // MUST have `type` and `id`
  //  these "should" be defined but we only care about the structure, not the values here
  for (let i = 0; i < ID_KEYS.length; i++) {
    let key = ID_KEYS[i];

    if (!memberPresent(resource, key)) {
      return false;
    }
  }

  // MUST have at least one other resource key (`attributes`, `links`, `relationships`)
  //  these "should" be defined but we only care about the structure, not the values here
  for (let i = 0; i < RESOURCE_KEYS.length; i++) {
    let key = RESOURCE_KEYS[i];

    if (memberPresent(resource, key)) {
      return true;
    }
  }

  return false;
}
