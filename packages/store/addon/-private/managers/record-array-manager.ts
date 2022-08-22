/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { _backburner as emberBackburner } from '@ember/runloop';

import type { CollectionResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { Dict } from '@ember-data/types/q/utils';

import { InstanceCache } from '../caches/instance-cache';
import AdapterPopulatedRecordArray, {
  AdapterPopulatedRecordArrayCreateArgs,
} from '../record-arrays/adapter-populated-record-array';
import RecordArray from '../record-arrays/record-array';
import type Store from '../store-service';

const RecordArraysCache = new Map<StableRecordIdentifier, Set<AdapterPopulatedRecordArray>>();

type ChangeSet = Map<StableRecordIdentifier, 'add' | 'del' | 'unk'>;

function _isManaged(
  cache: Set<AdapterPopulatedRecordArray>,
  arr: RecordArray | AdapterPopulatedRecordArray
): arr is AdapterPopulatedRecordArray {
  return cache.has(arr as AdapterPopulatedRecordArray);
}

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

  constructor(options: { store: Store }) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._live = new Map();
    this._managed = new Set();
    this._pending = new Map();
    this._willFlush = false;
    this._identifiers = RecordArraysCache;
  }

  _syncArray(array: RecordArray | AdapterPopulatedRecordArray) {
    const pending = this._pending.get(array);

    if (!pending || this.isDestroying || this.isDestroyed) {
      return;
    }
    let cache = this.store._instanceCache;
    const isManaged = _isManaged(this._managed, array);

    pending.forEach((value, key) => {
      let shouldRemove = isManaged;
      if (value === 'unk') {
        let isLoaded = cache.recordIsLoaded(key, true);
        if (isLoaded && isManaged) {
          shouldRemove = false;
          pending.delete(key);
        } else {
          pending.set(key, isLoaded ? 'add' : 'del');
        }
      }
      if (shouldRemove) {
        disassociateIdentifier(array as AdapterPopulatedRecordArray, key);
      }
    });

    array._updateState(pending as Map<StableRecordIdentifier, 'add' | 'del'>);
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
      let identifiers = visibleIdentifiersByType(this.store._instanceCache, type);
      array = RecordArray.create({
        modelName: type,
        content: A(identifiers || []),
        store: this.store,
        isLoaded: true,
        manager: this,
      });
      this._live.set(type, array);
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
    if (this._willFlush) {
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
    if (!liveArray || (liveArray.content.length === 0 && isRemove)) {
      return pending;
    }

    let changes = allPending.get(liveArray);
    if (!changes) {
      changes = new Map();
      allPending.set(liveArray, changes);
    }
    pending.set(liveArray, changes);

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
        changes.set(identifier, 'add');
        if (changes.size === 1) {
          this.dirtyArray(array);
        }
      });
    }
  }

  identifierRemoved(identifier: StableRecordIdentifier): void {
    let changeSets = this._getPendingFor(identifier, true, true);
    if (changeSets) {
      changeSets.forEach((changes, array) => {
        changes.set(identifier, 'del');
        if (changes.size === 1) {
          this.dirtyArray(array);
        }
      });
    }
  }

  identifierChanged(identifier: StableRecordIdentifier): void {
    let changeSets = this._getPendingFor(identifier, true);
    if (changeSets) {
      changeSets.forEach((changes, array) => {
        changes.set(identifier, 'unk');
        if (changes.size === 1) {
          this.dirtyArray(array);
        }
      });
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
function disassociateIdentifier(array: AdapterPopulatedRecordArray, identifier: StableRecordIdentifier) {
  let cache = RecordArraysCache.get(identifier);
  if (cache) {
    cache.delete(array);
  }
}

// TODO we can probably get rid of this and build up the list
// as we are notified of changes
// doing so *might* decrease costs by allowing us to avoid
// the `recordIsLoaded` check.
// for 100k records this is like 35ms currently
function visibleIdentifiersByType(cache: InstanceCache, type: string): StableRecordIdentifier[] {
  const list = cache.store.identifierCache._cache.types[type]?.lid;
  const visible: StableRecordIdentifier[] = [];
  const getLoaded = (identifier: StableRecordIdentifier) => {
    if (cache.recordIsLoaded(identifier, true)) {
      visible.push(identifier);
    }
  };
  list?.forEach(getLoaded);
  return visible;
}

export default RecordArrayManager;
