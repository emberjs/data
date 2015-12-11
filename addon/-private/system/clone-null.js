import EmptyObject from "ember-data/-private/system/empty-object";
export default function cloneNull(source) {
  var clone = new EmptyObject();
  for (var key in source) {
    clone[key] = source[key];
  }
  return clone;
}
