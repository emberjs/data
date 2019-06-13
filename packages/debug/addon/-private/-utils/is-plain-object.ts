export default function isPlainObject(obj: unknown): obj is Object {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj.constructor === Object || // {}
      obj.constructor === undefined) // Object.create(null)
  );
}
