export default function isNonEmptyString(str: unknown): str is string {
  return Boolean(str && typeof str === 'string');
}
