import memberPresent from './member-present';

export default function memberDefined(obj: object, member: string) {
  return memberPresent(obj, member) && obj[member] !== undefined;
}
