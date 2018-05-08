import { typeOf } from '@ember/utils';
import EmberArray from '@ember/array';

/*
  We're using this to detect arrays and "array-like" objects.

  This is a copy of the `isArray` method found in `ember-runtime/utils` as we're
  currently unable to import non-exposed modules.

  This method was previously exposed as `Ember.isArray` but since
  https://github.com/emberjs/ember.js/pull/11463 `Ember.isArray` is an alias of
  `Array.isArray` hence removing the "array-like" part.
 */
export default function isArrayLike(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray(obj)) { return true; }
  if (EmberArray.detect(obj)) { return true; }

  let type = typeOf(obj);
  if ('array' === type) { return true; }
  if ((obj.length !== undefined) && 'object' === type) { return true; }
  return false;
}
