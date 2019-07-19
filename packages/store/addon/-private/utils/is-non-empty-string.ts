export default function isNonEmptyString(str: any): str is string {
  return typeof str === 'string' && str.length > 0;
}
