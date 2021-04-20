import { assert } from '@ember/debug';

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;

const NULL_POINTER = `null-${Date.now()}`;

/*
 TODO Ember's guidFor returns a new string per-object reference
 while ours does not.

 This has surfaced a bug during resurrection
 in which Ember's guidFor would return false for `has` since the
 resurrected record receives a fresh RecordData instance, leaving
 the destroyed record in the set and thus depending on the state flags
 for it not appearing elsewhere. We've accounted for this bug in the
 updated OrderedSet implementation by doing a reference check: e.g.
 the bug is preserved.

 While we convert relationships to identifiers this will be something we
 will be forced to address.
*/
function guidFor(obj): string {
  if (obj === null) {
    return NULL_POINTER;
  }

  return obj.lid;
}

export default class OrderedSet<T> {
  declare presenceSet: Dict<T | null>;
  declare list: (T | null)[];
  declare size: number;

  constructor() {
    this.clear();
  }

  clear() {
    this.presenceSet = Object.create(null);
    this.list = [];
    this.size = 0;
  }

  add(obj: T | null): OrderedSet<T> {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an lid`, typeof guid === 'string' && guid !== '');
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] !== obj) {
      presenceSet[guid] = obj;
      this.size = list.push(obj);
    }

    return this;
  }

  delete(obj: T | null): boolean {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an lid`, typeof guid === 'string' && guid !== '');
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] === obj) {
      delete presenceSet[guid];
      let index = list.indexOf(obj);
      if (index > -1) {
        list.splice(index, 1);
      }
      this.size = list.length;
      return true;
    } else {
      return false;
    }
  }

  has(obj: T | null): boolean {
    if (this.size === 0) {
      return false;
    }
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an lid`, typeof guid === 'string' && guid !== '');
    return this.presenceSet[guid] === obj;
  }

  toArray(): (T | null)[] {
    return this.list.slice();
  }

  copy(): OrderedSet<T> {
    let set = new OrderedSet<T>();

    for (let prop in this.presenceSet) {
      set.presenceSet[prop] = this.presenceSet[prop];
    }

    set.list = this.toArray();
    set.size = this.size;

    return set;
  }

  addWithIndex(obj: T | null, idx?: number) {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an lid`, typeof guid === 'string' && guid !== '');
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] === obj) {
      return;
    }

    presenceSet[guid] = obj;

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
    assert(`Expected ${obj} to have an lid`, typeof guid === 'string' && guid !== '');
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] === obj) {
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
