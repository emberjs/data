export default function cloneNull(source) {
  let clone = Object.create(null);
  for (let key in source) {
    clone[key] = source[key];
  }
  return clone;
}
