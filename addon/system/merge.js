export default function merge(original, updates) {
  if (!updates || typeof updates !== 'object') {
    return original;
  }

  var props = Object.keys(updates);
  var prop;
  var length = props.length;

  for (var i = 0; i < length; i++) {
    prop = props[i];
    original[prop] = updates[prop];
  }

  return original;
}
