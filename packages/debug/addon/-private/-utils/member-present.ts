export default function memberPresent(obj: object, member: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, member);
}
