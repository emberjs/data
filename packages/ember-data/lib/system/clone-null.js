import {
  create
} from 'ember-data/system/object-polyfills';

export default function cloneNull(source) {
  var clone = create(null);
  for (var key in source) {
    clone[key] = source[key];
  }
  return clone;
}
