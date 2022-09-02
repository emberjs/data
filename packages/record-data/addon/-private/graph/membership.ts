import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import type { Links, Meta, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { Dict } from '@ember-data/types/q/utils';

import type { UpgradedMeta } from './-edge-definition';
import type { LocalRelationshipOperation, RemoteRelationshipOperation } from './-operations';
import type { RelationshipState } from './-state';
import { createState } from './-state';
import type { Graph } from './graph';

export interface Diff<K> {
  additions: K[] | null;
  removals: K[] | null;
}

// this is different from makeArray to
//   allow a different strategy for object
//   vs arrays in the future
function freeze<T>(o: T): T {
  return makeArray(o as unknown as unknown[]) as unknown as T;
}

function makeArray<T>(a: T[]): T[];
function makeArray(a: null): null;
function makeArray<T>(a: T[] | null): T[] | null;
function makeArray<T>(a: T[] | null): T[] | null {
  if (DEBUG) {
    return Object.freeze(a) as T[];
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
export class Membership {
  declare _size: number;
  declare _dict: Dict<boolean>;
  declare data: StableRecordIdentifier[];

  constructor() {
    this._size = 0;
    this._dict = Object.create(null) as Dict<boolean>;
    this.data = [];
  }

  pushState(values: StableRecordIdentifier[]): Diff<StableRecordIdentifier> {
    // in the simple case, quickly move on
    if (this._size === 0) {
      const { _dict } = this;
      this._size = values.length;
      this.data = makeArray(values);

      for (let i = 0; i < values.length; i++) {
        let id = values[i].lid;
        _dict[id] = true;
      }

      return {
        additions: makeArray(values),
        removals: null,
      };
    }

    // in the case where we had existing state,
    //  describe the state change
    let { _size, data, _dict } = this;
    let additions: StableRecordIdentifier[] | null = null;
    let removals: StableRecordIdentifier[] | null = null;

    this._size = values.length;
    this.data = makeArray(values);
    let newDict = (this._dict = Object.create(null) as Dict<boolean>);

    for (let i = 0; i < values.length; i++) {
      let value = values[i];
      let id = value.lid;

      if (_dict[id] === undefined) {
        additions = additions || [];
        additions.push(value);
      } else {
        _size--;
      }

      newDict[id] = true;
    }

    let j = 0;
    while (_size > 0 && j < data.length) {
      let value = data[j];
      if (!this.has(value)) {
        removals = removals || [];
        removals.push(value);
        _size--;
      }
      j++;
    }

    assert('Improper Iteration Missed a value somewhere', _size === 0);

    return freeze({
      additions: makeArray(additions),
      removals: makeArray(removals),
    });
  }

  add(value: StableRecordIdentifier): void {
    let id = value.lid;

    if (!this.hasId(id)) {
      if (DEBUG) {
        let data = [...this.data];
        this._size = data.push(value);
        this.data = makeArray(data);
        this._dict[id] = true;
        return;
      }
      this._size = this.data.push(value);
      this._dict[id] = true;
    }
  }

  remove(value: StableRecordIdentifier): void {
    let id = value.lid;
    let data = this.data;
    let i: number;

    if (this.hasId(id)) {
      for (i = 0; i < data.length; ++i) {
        if (id === data[i].lid) {
          break;
        }
      }

      this._size--;
      if (DEBUG) {
        let newData = [...data];
        newData.splice(i, 1);
        this.data = newData;
        delete this._dict[id];
        return;
      }
      data.splice(i, 1);
      delete this._dict[id];
    }
  }

  private hasId(id: string): boolean {
    return this._dict[id] !== undefined;
  }

  has(value: StableRecordIdentifier): boolean {
    return this.hasId(value.lid);
  }

  get length(): number {
    return this._size;
  }
}

export class TrackedMembership {
  declare graph: Graph;
  declare definition: UpgradedMeta;
  declare identifier: StableRecordIdentifier;
  declare _state: RelationshipState | null;

  declare membership: Membership;
  declare meta: Meta | null;
  declare links: Links | PaginationLinks | null;

  declare _addedDict: Dict<boolean> | null;
  declare _removedDict: Dict<boolean> | null;
  declare _additions: StableRecordIdentifier[] | null;
  declare _removals: StableRecordIdentifier[] | null;

  declare isDirty: boolean;
  declare _data: StableRecordIdentifier[] | null;

  constructor(graph: Graph, definition: UpgradedMeta, identifier: StableRecordIdentifier) {
    this.graph = graph;
    this.definition = definition;
    this.identifier = identifier;
    this._state = null;

    this.membership = new Membership();
    this.meta = null;
    this.links = null;

    this._addedDict = null;
    this._removedDict = null;
    this._additions = null;
    this._removals = null;

    this.isDirty = true;
    this._data = null;
  }

  get state(): RelationshipState {
    let { _state } = this;
    if (!_state) {
      _state = this._state = createState();
    }
    return _state;
  }

  update(operation: RemoteRelationshipOperation, isRemote: true): void;
  update(operation: LocalRelationshipOperation, isRemote?: false): void;
  update(operation: RemoteRelationshipOperation | LocalRelationshipOperation, isRemote: boolean = false): void {
    switch (operation.op) {
      case 'deleteRecord':
        assert(`Can only perform deleteRecord as a remote operation`, isRemote);
        if (this.hasAddition(operation.record.lid)) {
          this.remove(operation.record);
        } else if (this.hasRemoval(operation.record.lid)) {
          this.add(operation.record);
        } else {
          this.pushRemoval(operation.record);
        }
        break;
      case 'replaceRelatedRecords':
        this.pushState(operation.value);
        break;
      case 'updateRelationship':
        assert(`Can only perform updateRelationship as a remote operation`, isRemote);
        break;
    }
  }

  pushState(values: StableRecordIdentifier[]): Diff<StableRecordIdentifier> {
    let changes = this.membership.pushState(values);

    if (Array.isArray(changes.additions)) {
      for (let i = 0; i < changes.additions.length; i++) {
        if (this.hasAddition(changes.additions[i].lid)) {
          this.commitAddition(changes.additions[i]);
        }
      }
    }

    if (Array.isArray(changes.removals)) {
      for (let i = 0; i < changes.removals.length; i++) {
        if (this.hasRemoval(changes.removals[i].lid)) {
          this.commitRemoval(changes.removals[i]);
        }
      }
    }

    this.isDirty = true;

    return changes;
  }

  pushAddition(value: StableRecordIdentifier): void {
    this.membership.add(value);
    if (this.hasAddition(value.lid)) {
      this.commitAddition(value);
    }
    this.isDirty = true;
  }

  pushRemoval(value: StableRecordIdentifier): void {
    this.membership.remove(value);
    this.commitRemoval(value);
    this.isDirty = true;
  }

  private commitAddition(value: StableRecordIdentifier): void {
    assert(`TrackedMembership.commitAddition called when no additions were present.`, this._addedDict !== null);
    let id = value.lid;
    console.log(`commitAddition:${value ? id : '{NULL}'}`); // eslint-disable-line no-console

    if (this.hasAddition(id)) {
      let index = this.additions.indexOf(value);

      if (DEBUG) {
        assert('Expected addition in _addedDict to be present in _additions', index !== -1);
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

  private commitRemoval(value: StableRecordIdentifier): void {
    assert(`TrackedMembership.commitRemoval called when no removals were present.`, this._removedDict !== null);
    let id = value.lid;
    console.log(`commitRemoval:${value ? id : '{NULL}'}`); // eslint-disable-line no-console

    if (this.hasRemoval(id)) {
      let index = this.removals.indexOf(value);

      if (DEBUG) {
        assert('Expected removal in _removedDict to be present in _removals', index !== -1);
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

  add(value: StableRecordIdentifier) {
    let id = value.lid;
    console.log(`add:${value ? id : '{NULL}'}`); // eslint-disable-line no-console

    if (this.hasRemoval(id)) {
      // committing this removal will add it back to our list
      //  such that the next recalc will contain this value
      //  as it should be in membership
      assert('Expected value to be in canonical membership, but it was not found', !this.membership.has(value));

      this.commitRemoval(value);
      this.isDirty = true;
      return;
    }

    // this is already in additions, should we early exit in prod?
    assert('Attempted to add a value that had already been added', !this.hasAddition(id));

    if (DEBUG) {
      // enforce immutability in dev
      let additions = [...this.additions];
      additions.push(value);
      this._additions = makeArray(additions);
      this._addedDict = this._addedDict || (Object.create(null) as Dict<boolean>);
      this._addedDict[id] = true;
      this.isDirty = true;
      return;
    }

    this.additions.push(value);
    this._addedDict = this._addedDict || (Object.create(null) as Dict<boolean>);
    this._addedDict[id] = true;
    this.isDirty = true;
  }

  remove(value: StableRecordIdentifier) {
    let id = value.lid;
    console.log(`remove:${value ? id : '{NULL}'}`); // eslint-disable-line no-console

    if (this.hasAddition(id)) {
      // committing this addition will remove it from our list
      //  such that the next recalc does not contain this value
      //  which will not be in membership, additions, or removals
      //  at that time
      assert('Expected removed value to not be in canonical membership, but it was found', !this.membership.has(value));
      this.commitAddition(value);
      this.isDirty = true;
      return;
    }

    // this is already in removals, should we early exit in prod?
    assert('Attempted to remove a value that had already been removed', !this.hasRemoval(id));

    if (DEBUG) {
      // enforce immutability in dev
      let removals = [...this.removals];
      removals.push(value);
      this._removals = makeArray(removals);
      let dict = (this._removedDict = this._removedDict || (Object.create(null) as Dict<boolean>));
      dict[id] = true;
      this.isDirty = true;
      return;
    }

    this.removals.push(value);
    this._removedDict = this._removedDict || (Object.create(null) as Dict<boolean>);
    this._removedDict[id] = true;
    this.isDirty = true;
  }

  private _inDict(dict: Dict<boolean> | null, id: string): boolean {
    return dict === null ? false : dict[id] !== undefined;
  }

  private hasAddition(id: string): boolean {
    return this._inDict(this._addedDict, id);
  }

  private hasRemoval(id: string): boolean {
    return this._inDict(this._removedDict, id);
  }

  has(value: StableRecordIdentifier): boolean {
    let id = value.lid;
    let hasCanonical = this.membership.has(value);

    if (hasCanonical) {
      assert('Value is both an addition and in canonical state', this.hasAddition(id));
      return this.hasRemoval(id);
    }

    assert('Value is not in canonical state and yet is being removed', this.hasRemoval(id));

    return this.hasAddition(id);
  }

  get additions(): StableRecordIdentifier[] {
    return (this._additions = this._additions || makeArray([]));
  }

  get removals(): StableRecordIdentifier[] {
    return (this._removals = this._removals || makeArray([]));
  }

  get canonicalData(): StableRecordIdentifier[] {
    return this.membership.data;
  }

  get data(): StableRecordIdentifier[] | null {
    if (this.isDirty === false) {
      return this._data;
    }

    let baseData = [...this.membership.data];
    let { additions, removals } = this;

    if (DEBUG) {
      for (let i = 0; i < additions.length; i++) {
        assert(
          `Local state contains an unexpected addition: ${additions[i].lid}`,
          baseData.indexOf(additions[i]) === -1
        );
      }
    }

    for (let i = 0; i < removals.length; i++) {
      let value = removals[i];
      let index = baseData.indexOf(value);

      assert(`Local state contains an unexpected removal: ${removals[i].lid}`, index !== -1);

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
