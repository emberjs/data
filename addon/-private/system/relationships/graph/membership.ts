import { DEBUG } from '@glimmer/env';

type TDict<K extends string, V> = { [KK in K]: V };
type Tlid = string;

export interface IDiff<K> {
  additions: K[] | null;
  removals: K[] | null;
}

// this is different from makeArray to
//   allow a different strategy for object
//   vs arrays in the future
function freeze(o) {
  return makeArray(o);
}

function makeArray(a) {
  if (DEBUG) {
    return Object.freeze(a);
  }
  return a;
}

/*
  Requirements these classes were built to fulfill:

  - fast lookup of membership O(1)
  - fast removal of membership O(1) + O(n/2)
  - efficient diffing on `push`
  - efficient tracking of local changes
  - efficient "flush canonical"
*/
export class Membership<TVAL> {
  private size: number = 0;
  private dict: TDict<Tlid, boolean> = Object.create(null);
  public data: TVAL[];

  constructor(initialValues: TVAL[], private __id__: Tlid = 'lid') {
    this.pushState(initialValues);
  }

  pushState(values: TVAL[]): IDiff<TVAL> {
    // in the simple case, quickly move on
    if (this.size === 0) {
      let { dict } = this;
      this.size = values.length;
      this.data = makeArray(values);

      for (let i = 0; i < values.length; i++) {
        let id = this.idFor(values[i]);
        dict[id] = true;
      }

      return {
        additions: makeArray(values),
        removals: null,
      };
    }

    // in the case where we had existing state,
    //  describe the state change
    let { size, data, dict } = this;
    let additions = null;
    let removals = null;

    this.size = values.length;
    this.data = makeArray(values);
    let newDict = (this.dict = Object.create(null));

    for (let i = 0; i < values.length; i++) {
      let value = values[i];
      let id = this.idFor(value);

      if (dict[id] === undefined) {
        additions = additions || [];
        additions.push(value);
      } else {
        size--;
      }

      newDict[id] = true;
    }

    let j = 0;
    while (size > 0 && j < data.length) {
      let value = data[j];
      if (!this.has(value)) {
        removals = removals || [];
        removals.push(value);
        size--;
      }
      j++;
    }

    if (DEBUG) {
      if (size > 0) {
        throw new Error('Improper Iteration Missed a value somewhere');
      }
    }

    return freeze({
      additions: makeArray(additions),
      removals: makeArray(removals),
    });
  }

  public idFor(value: TVAL): Tlid {
    if (DEBUG) {
      if (
        typeof value !== 'object' ||
        value === null ||
        typeof value[this.__id__] !== 'string' ||
        value[this.__id__].length === 0
      ) {
        debugger;
        throw new Error('Invalid Value Provided as Membership Member');
      }
    }
    return value[this.__id__];
  }

  add(value: TVAL): void {
    let id = this.idFor(value);

    if (!this.hasId(id)) {
      if (DEBUG) {
        let data = [...this.data];
        this.size = data.push(value);
        this.data = makeArray(data);
        this.dict[id] = true;
        return;
      }
      this.size = this.data.push(value);
      this.dict[id] = true;
    }
  }

  remove(value: TVAL): void {
    let id = this.idFor(value);
    let data = this.data;
    let i;

    if (this.hasId(id)) {
      for (i = 0; i < data.length; ++i) {
        if (id === this.idFor(data[i])) {
          break;
        }
      }

      this.size--;
      if (DEBUG) {
        let newData = [...data];
        newData.splice(i, 1);
        this.data = newData;
        delete this.dict[id];
        return;
      }
      data.splice(i, 1);
      delete this.dict[id];
    }
  }

  private hasId(id: Tlid): boolean {
    return this.dict[id] !== undefined;
  }

  has(value: TVAL): boolean {
    let id = this.idFor(value);

    return this.hasId(id);
  }

  get length(): number {
    return this.size;
  }
}

export class TrackedMembership<TVAL> {
  private membership: Membership<TVAL>;
  private _addedDict: TDict<Tlid, boolean> | null = null;
  private _removedDict: TDict<Tlid, boolean> | null = null;
  private _additions: TVAL[] | null = null;
  private _removals: TVAL[] | null = null;
  private isDirty: boolean = true;
  private _data: TVAL[] | null;

  constructor(initialValues: TVAL[], private __id__: Tlid = 'lid') {
    this.membership = new Membership(initialValues, this.__id__);
  }

  pushState(values: TVAL[]): IDiff<TVAL> {
    let changes = this.membership.pushState(values);

    if (Array.isArray(changes.additions)) {
      for (let i = 0; i < changes.additions.length; i++) {
        this.commitAddition(changes.additions[i]);
      }
    }

    if (Array.isArray(changes.removals)) {
      for (let i = 0; i < changes.removals.length; i++) {
        this.commitRemoval(changes.removals[i]);
      }
    }

    this.isDirty = true;

    return changes;
  }

  pushAddition(value: TVAL): void {
    this.membership.add(value);
    this.commitAddition(value);
    this.isDirty = true;
  }

  pushRemoval(value: TVAL): void {
    this.membership.remove(value);
    this.commitRemoval(value);
    this.isDirty = true;
  }

  private commitAddition(value: TVAL): void {
    let id = this.idFor(value);
    console.log(`commitAddition:${value ? id : '{NULL}'}`);

    if (this.hasAddition(id)) {
      let index = this.additions.indexOf(value);

      if (DEBUG) {
        if (index === -1) {
          throw new Error('Expected addition in _addedDict to be present in _additions');
        }
        // enforce immutability in dev
        let additions = [...this.additions];
        additions.splice(index, 1);
        this._additions = makeArray(additions);
        delete this._addedDict[id];
        return;
      }

      this.additions.splice(index, 1);
      delete this._addedDict[id];
    }
  }

  private commitRemoval(value: TVAL): void {
    let id = this.idFor(value);
    console.log(`commitRemoval:${value ? id : '{NULL}'}`);

    if (this.hasRemoval(id)) {
      let index = this.removals.indexOf(value);

      if (DEBUG) {
        if (index === -1) {
          throw new Error('Expected removal in _removedDict to be present in _removals');
        }
        // enforce immutability in dev
        let removals = [...this.removals];
        removals.splice(index, 1);
        this._removals = makeArray(removals);
        delete this._removedDict[id];
        return;
      }

      this.removals.splice(index, 1);
      delete this._removedDict[id];
    }
  }

  add(value: TVAL) {
    let id = this.idFor(value);
    console.log(`add:${value ? id : '{NULL}'}`);

    if (this.hasRemoval(id)) {
      // committing this removal will add it back to our list
      //  such that the next recalc will contain this value
      //  as it should be in membership
      if (DEBUG) {
        if (!this.membership.has(value)) {
          throw new Error('Expected value to be in canonical membership, but it was not found');
        }
      }
      this.commitRemoval(value);
      this.isDirty = true;
      return;
    }

    // this is already in additions, ignore
    if (this.hasAddition(id)) {
      if (DEBUG) {
        throw new Error('Attempted to add a value that had already been added');
      }
      return;
    }
    if (DEBUG) {
      // enforce immutability in dev
      let additions = [...this.additions];
      additions.push(value);
      this._additions = makeArray(additions);
      this._addedDict = this._addedDict || Object.create(null);
      this._addedDict[id] = true;
      this.isDirty = true;
      return;
    }

    this.additions.push(value);
    this._addedDict = this._addedDict || Object.create(null);
    this._addedDict[id] = true;
    this.isDirty = true;
  }

  remove(value: TVAL) {
    let id = this.idFor(value);
    console.log(`remove:${value ? id : '{NULL}'}`);

    if (this.hasAddition(id)) {
      // committing this addition will remove it from our list
      //  such that the next recalc does not contain this value
      //  which will not be in membership, additions, or removals
      //  at that time
      if (DEBUG) {
        if (this.membership.has(value)) {
          throw new Error(
            'Expected removed value to not be in canonical membership, but it was found'
          );
        }
      }
      this.commitAddition(value);
      this.isDirty = true;
      return;
    }

    // this is already in removals, ignore
    if (this.hasRemoval(id)) {
      if (DEBUG) {
        throw new Error('Attempted to remove a value that had already been removed');
      }
      return;
    }

    if (DEBUG) {
      // enforce immutability in dev
      let removals = [...this.removals];
      removals.push(value);
      this._removals = makeArray(removals);
      this._removedDict = this._removedDict || Object.create(null);
      this._removedDict[id] = true;
      this.isDirty = true;
      return;
    }

    this.removals.push(value);
    this._removedDict = this._removedDict || Object.create(null);
    this._removedDict[id] = true;
    this.isDirty = true;
  }

  private idFor(value: TVAL): Tlid {
    return this.membership.idFor(value);
  }

  private _inDict(dict: TDict<Tlid, boolean> | null, id: Tlid): boolean {
    return dict === null ? false : dict[id] !== undefined;
  }

  private hasAddition(id: Tlid): boolean {
    return this._inDict(this._addedDict, id);
  }

  private hasRemoval(id: Tlid): boolean {
    return this._inDict(this._removedDict, id);
  }

  has(value: TVAL): boolean {
    let id = this.idFor(value);
    let hasCanonical = this.membership.has(value);

    if (hasCanonical) {
      if (DEBUG) {
        if (this.hasAddition(id) === true) {
          throw new Error('Value is both an addition and a removal');
        }
      }
      return this.hasRemoval(id) === false;
    }

    if (DEBUG) {
      if (this.hasRemoval(id) === true) {
        throw new Error('Value is both an addition and a removal');
      }
    }

    return this.hasAddition(id) === true;
  }

  get additions(): TVAL[] {
    return (this._additions = this._additions || makeArray([]));
  }

  get removals(): TVAL[] {
    return (this._removals = this._removals || makeArray([]));
  }

  get canonicalData(): TVAL[] {
    return this.membership.data;
  }

  get data(): TVAL[] {
    if (this.isDirty === false) {
      return this._data;
    }

    let baseData = [...this.membership.data];
    let { additions, removals } = this;

    if (DEBUG) {
      for (let i = 0; i < additions.length; i++) {
        if (baseData.indexOf(additions[i]) !== -1) {
          throw new Error(
            `Local state contains an unexpected addition: ${this.idFor(additions[i])}`
          );
        }
      }
    }

    for (let i = 0; i < removals.length; i++) {
      let value = removals[i];
      let index = baseData.indexOf(value);

      if (DEBUG) {
        if (index === -1) {
          debugger;
          throw new Error(`Local state contains an unexpected removal: ${this.idFor(removals[i])}`);
        }
      }

      if (index !== -1) {
        baseData.splice(index, 1);
      }
    }

    baseData.push(...additions);
    this._data = makeArray(baseData);
    this.isDirty = false;

    return this._data;
  }

  getChanges() {
    return freeze({
      canonical: this.canonicalData,
      additions: this.additions,
      removals: this.removals,
    });
  }
}
