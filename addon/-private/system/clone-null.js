import EmptyObject from "ember-data/-private/system/empty-object";
export default function cloneNull(source) {
  let clone = new EmptyObject();
  for (let key in source) {
    clone[key] = source[key];
  }
  return clone;
}
