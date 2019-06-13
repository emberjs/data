import isPlainObject from './is-plain-object';
import memberPresent from './member-present';
import isResource from './is-resource';

const ID_KEYS = ['type', 'id'];
const ALLOWED_KEYS = ['meta'];
export const ALL_REFERENCE_KEYS = [].concat(ID_KEYS, ALLOWED_KEYS);

/**
 * Loosely determine if an object might be a Reference
 *
 * unknown keys and undefined keys are allowed through, this just validates
 * that `type` `id` AND optionally `meta` is present. If one of `attributes`
 * `links` or `relationships` is present on the object even if set to `undefined`,
 * we return `false` as this matches a resource.
 *
 * @param resourceIdentifier
 * @returns {boolean}
 */
export default function isResourceIdentifier(resourceIdentifier) {
  if (!isPlainObject(resourceIdentifier)) {
    return false;
  }

  // MUST NOT have `links` `relationships` and `attributes`
  if (isResource(resourceIdentifier)) {
    return false;
  }

  // MUST have both `type` and `id`
  //  these "should" be defined but we only care about the structure, not the values here
  for (let i = 0; i < ID_KEYS.length; i++) {
    let key = ID_KEYS[i];

    if (!memberPresent(resourceIdentifier, key)) {
      return false;
    }
  }

  return true;
}
