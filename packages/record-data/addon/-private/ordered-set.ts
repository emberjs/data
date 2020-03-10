import { assert } from '@ember/debug';
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

  deleteWithIndex(obj: T | null, idx?: number): boolean {
    let guid = guidFor(obj);
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] === true) {
      delete presenceSet[guid];

      assert('object is not present at specified index', idx === undefined || list[idx] === obj);

      let index = idx !== undefined ? idx : list.indexOf(obj);
      if (index > -1) {
        list.splice(index, 1);
      }
      this.size = list.length;
      return true;
    } else {
      return false;
    }
  }
}
