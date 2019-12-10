import { guidFor } from '@ember/object/internals';
import EmberOrderedSet from '@ember/ordered-set';

export default class EmberDataOrderedSet<T> extends EmberOrderedSet<T> {
  static create() {
    return new this();
  }

  addWithIndex(obj: T, idx?: number) {
    let guid = guidFor(obj);
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] === true) {
      return;
    }

    presenceSet[guid] = true;

    if (idx === undefined || idx === null) {
      list.push(obj);
    } else {
      list.splice(idx, 0, obj);
    }

    this.size += 1;

    return this;
  }
}
