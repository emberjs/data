import memberDefined from './member-defined';

import { IObject } from 'ember-data';

export default function memberDefinedAndNotNull(obj: IObject, member: string) {
  return memberDefined(obj, member) && obj[member] !== null;
}
