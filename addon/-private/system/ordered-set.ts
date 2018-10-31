import EmberOrderedSet from '@ember/ordered-set';
import { guidFor } from '@ember/object/internals';

export default class EmberDataOrderedSet extends EmberOrderedSet {
  static create() {
    return new this();
  }

  addWithIndex(obj, idx) {
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
