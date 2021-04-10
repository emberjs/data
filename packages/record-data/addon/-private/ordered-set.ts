import { assert } from '@ember/debug';

type Dict<T> = import('@ember-data/store/-private/ts-interfaces/utils').Dict<T>;
type RelationshipRecordData = import('./ts-interfaces/relationship-record-data').RelationshipRecordData;

const NULL_POINTER = `null-${Date.now()}`;

function guidFor(obj): string {
  if (obj === null) {
    return NULL_POINTER;
  }
  return obj.clientId || obj.lid;
}

/**
@class OrderedSet
@constructor
*/
export default class OrderedSet {
  declare presenceSet: Dict<boolean>;
  declare list: (RelationshipRecordData | null)[];
  declare size: number;

  constructor() {
    this.clear();
  }

  /**
  @method clear
  */
  clear() {
    this.presenceSet = Object.create(null);
    this.list = [];
    this.size = 0;
  }

  /**
  @method add
  @param {*} obj
  @return {OrderedSet}
  */
  add(obj: RelationshipRecordData): OrderedSet {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an clientId`, typeof guid === 'string' && guid !== '');
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] !== true) {
      presenceSet[guid] = true;
      this.size = list.push(obj);
    }

    return this;
  }

  /**
  @method delete
  @param {*} obj
  @param {string} [_guid] (for internal use)
  @return {Boolean}
  */
  delete(obj: RelationshipRecordData): boolean {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an clientId`, typeof guid === 'string' && guid !== '');
    let presenceSet = this.presenceSet;
    let list = this.list;

    if (presenceSet[guid] === true) {
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

  /**
  @method has
  @param {*} obj
  @return {Boolean}
  */
  has(obj: RelationshipRecordData): boolean {
    if (this.size === 0) {
      return false;
    }
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an clientId`, typeof guid === 'string' && guid !== '');
    return this.presenceSet[guid] === true;
  }

  /**
  @method toArray
  @return {Array}
  */
  toArray(): (RelationshipRecordData | null)[] {
    return this.list.slice();
  }

  /**
  @method copy
  @return {OrderedSet}
  */
  copy(): OrderedSet {
    let set = new OrderedSet();

    for (let prop in this.presenceSet) {
      set.presenceSet[prop] = this.presenceSet[prop];
    }

    set.list = this.toArray();
    set.size = this.size;

    return set;
  }

  addWithIndex(obj: RelationshipRecordData, idx?: number) {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an clientId`, typeof guid === 'string' && guid !== '');
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

  deleteWithIndex(obj: RelationshipRecordData | null, idx?: number): boolean {
    let guid = guidFor(obj);
    assert(`Expected ${obj} to have an clientId`, typeof guid === 'string' && guid !== '');
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
