export default function cloneNull<T extends object>(source: T): { [K in keyof T]: T[K] } {
  let clone = Object.create(null);
  for (let key in source) {
    clone[key] = source[key];
  }
  return clone;
}
