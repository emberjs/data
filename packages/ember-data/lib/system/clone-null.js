export default function cloneNull(source) {
  var clone = Ember.create(null);
  for (var key in source) {
    clone[key] = source[key];
  }
  return clone;
}
