function merge(original, updates) {
  if (!updates || typeof updates !== 'object') {
    return original;
  }

  var props = Ember.keys(updates);
  var prop;
  var length = props.length;

  for (var i = 0; i < length; i++) {
    prop = props[i];
    original[prop] = updates[prop];
  }

  return original;
}

export default merge;
