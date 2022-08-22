/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { _backburner as emberBackburner } from '@ember/runloop';

import type { CollectionResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { Dict } from '@ember-data/types/q/utils';

import AdapterPopulatedRecordArray, {
  AdapterPopulatedRecordArrayCreateArgs,
} from '../record-arrays/adapter-populated-record-array';
import RecordArray from '../record-arrays/record-array';
import type Store from '../store-service';

const RecordArraysCache = new Map<StableRecordIdentifier, Set<AdapterPopulatedRecordArray>>();
const FAKE_ARR = {};

type ChangeSet = Map<StableRecordIdentifier, 'add' | 'del'>;

/**
  @class RecordArrayManager
  @internal
*/
class RecordArrayManager {
  declare store: Store;
  declare isDestroying: boolean;
  declare isDestroyed: boolean;
  declare _live: Map<string, RecordArray>;
  declare _managed: Set<AdapterPopulatedRecordArray>;
  declare _pending: Map<RecordArray | AdapterPopulatedRecordArray, ChangeSet>;
  declare _willFlush: boolean;
  declare _identifiers: Map<StableRecordIdentifier, Set<AdapterPopulatedRecordArray>>;
  declare _staged: Map<string, ChangeSet>;

  constructor(options: { store: Store }) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._live = new Map();
    this._managed = new Set();
    this._pending = new Map();
    this._staged = new Map();
    this._willFlush = false;
    this._identifiers = RecordArraysCache;
  }

  _syncArray(array: RecordArray | AdapterPopulatedRecordArray) {
    const pending = this._pending.get(array);

    if (!pending || this.isDestroying || this.isDestroyed) {
      return;
    }

    array._updateState(pending);
    this._pending.delete(array);
  }

  /**
    Get the `RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @method liveArrayFor
    @internal
    @param {String} modelName
    @return {RecordArray}
  */
  liveArrayFor(type: string): RecordArray {
    let array = this._live.get(type);

    if (!array) {
      array = RecordArray.create({
        modelName: type,
        content: A([]),
        store: this.store,
        isLoaded: true,
        manager: this,
      });
      this._live.set(type, array);

      let staged = this._staged.get(type);
      if (staged) {
        this._pending.set(array, staged);
        this._staged.delete(type);
        array._notify();
      }
    } else {
      let pending = this._pending.get(array);
      if (pending) {
        array._notify();
      }
    }

    return array;
  }

  createArray(config: {
    type: string;
    query?: Dict<unknown>;
    identifiers?: StableRecordIdentifier[];
    doc?: CollectionResourceDocument;
  }): AdapterPopulatedRecordArray {
    let options: AdapterPopulatedRecordArrayCreateArgs = {
      modelName: config.type,
      links: config.doc?.links || null,
      meta: config.doc?.meta || null,
      query: config.query || null,
      content: A(config.identifiers || []),
      isLoaded: !!config.identifiers?.length,
      store: this.store,
      manager: this,
    };
    let array = AdapterPopulatedRecordArray.create(options);
    this._managed.add(array);
    if (config.identifiers) {
      associate(array, config.identifiers);
    }

    return array;
  }

  dirtyArray(array: RecordArray | AdapterPopulatedRecordArray): void {
    if (array === FAKE_ARR || this._willFlush) {
      return;
    }
    this._willFlush = true;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    emberBackburner.schedule('actions', this, this._flush);
  }

  _flush() {
    this._willFlush = false;
    let pending = this._pending;
    pending.forEach((_changes, recordArray) => {
      recordArray._notify();
    });
  }

  _getPendingFor(
    identifier: StableRecordIdentifier,
    includeManaged: boolean,
    isRemove?: boolean
  ): Map<RecordArray | AdapterPopulatedRecordArray, ChangeSet> | void {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    let liveArray = this._live.get(identifier.type);
    const allPending = this._pending;
    let pending: Map<RecordArray | AdapterPopulatedRecordArray, ChangeSet> = new Map();

    if (includeManaged) {
      let managed = RecordArraysCache.get(identifier);
      if (managed) {
        managed.forEach((arr) => {
          let changes = allPending.get(arr);
          if (!changes) {
            changes = new Map();
            allPending.set(arr, changes);
          }
          pending.set(arr, changes);
        });
      }
    }

    // during unloadAll we can ignore removes since we've already
    // cleared the array.
    if (liveArray && liveArray.content.length === 0 && isRemove) {
      return pending;
    }

    if (!liveArray) {
      // start building a changeset for when we eventually
      // do have a live array
      let changes = this._staged.get(identifier.type);
      if (!changes) {
        changes = new Map();
        this._staged.set(identifier.type, changes);
      }
      pending.set(FAKE_ARR as RecordArray, changes);
    } else {
      let changes = allPending.get(liveArray);
      if (!changes) {
        changes = new Map();
        allPending.set(liveArray, changes);
      }
      pending.set(liveArray, changes);
    }

    return pending;
  }

  populateManagedArray(
    array: AdapterPopulatedRecordArray,
    identifiers: StableRecordIdentifier[],
    payload: CollectionResourceDocument
  ) {
    this._pending.delete(array);
    const old = array.content;
    array.content.setObjects(identifiers); // this will also notify
    array.meta = payload.meta || null;
    array.links = payload.links || null;
    array.isLoaded = true;

    disassociate(array, old);
    associate(array, identifiers);
  }

  identifierAdded(identifier: StableRecordIdentifier): void {
    let changeSets = this._getPendingFor(identifier, false);
    if (changeSets) {
      changeSets.forEach((changes, array) => {
        let existing = changes.get(identifier);
        if (existing === 'del') {
          changes.delete(identifier);
        } else {
          changes.set(identifier, 'add');

          if (changes.size === 1) {
            this.dirtyArray(array);
          }
        }
      });
    }
  }

  identifierRemoved(identifier: StableRecordIdentifier): void {
    let changeSets = this._getPendingFor(identifier, true, true);
    if (changeSets) {
      changeSets.forEach((changes, array) => {
        let existing = changes.get(identifier);
        if (existing === 'add') {
          changes.delete(identifier);
        } else {
          changes.set(identifier, 'del');

          if (changes.size === 1) {
            this.dirtyArray(array);
          }
        }
      });
    }
  }

  identifierChanged(identifier: StableRecordIdentifier): void {
    let newState = this.store._instanceCache.recordIsLoaded(identifier, true);

    if (newState) {
      this.identifierAdded(identifier);
    } else {
      this.identifierRemoved(identifier);
    }
  }

  clear() {
    this._live.forEach((array) => array.destroy());
    this._managed.forEach((array) => array.destroy());
    this._managed.clear();
    RecordArraysCache.clear();
  }

  destroy() {
    this.isDestroying = true;
    this.clear();
    this._live.clear();
    this.isDestroyed = true;
  }
}

function associate(array: AdapterPopulatedRecordArray, identifiers: StableRecordIdentifier[]) {
  for (let i = 0; i < identifiers.length; i++) {
    let identifier = identifiers[i];
    let cache = RecordArraysCache.get(identifier);
    if (!cache) {
      cache = new Set();
      RecordArraysCache.set(identifier, cache);
    }
    cache.add(array);
  }
}
function disassociate(array: AdapterPopulatedRecordArray, identifiers: StableRecordIdentifier[]) {
  for (let i = 0; i < identifiers.length; i++) {
    disassociateIdentifier(array, identifiers[i]);
  }
}
export function disassociateIdentifier(array: AdapterPopulatedRecordArray, identifier: StableRecordIdentifier) {
  let cache = RecordArraysCache.get(identifier);
  if (cache) {
    cache.delete(array);
  }
}

export default RecordArrayManager;
