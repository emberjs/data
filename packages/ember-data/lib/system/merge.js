import {
  keysFunc
} from 'ember-data/system/object-polyfills';

function merge(original, updates) {
  if (!updates || typeof updates !== 'object') {
    return original;
  }
  var props = keysFunc(updates);
  var prop;
  var length = props.length;

  for (var i = 0; i < length; i++) {
    prop = props[i];
    original[prop] = updates[prop];
  }

  return original;
}

export default merge;
