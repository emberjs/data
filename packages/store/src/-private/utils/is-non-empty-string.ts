export default function isNonEmptyString(str: any): str is string {
  return str && typeof str === 'string';
}
