/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { _backburner as emberBackburner } from '@ember/runloop';

import type { CollectionResourceDocument, Meta } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { Dict } from '@ember-data/types/q/utils';

import { InstanceCache } from '../caches/instance-cache';
import AdapterPopulatedRecordArray from '../record-arrays/adapter-populated-record-array';
import RecordArray from '../record-arrays/record-array';
import type Store from '../store-service';

const RecordArraysCache = new Map<StableRecordIdentifier, Set<AdapterPopulatedRecordArray>>();

type ChangeSet = Map<StableRecordIdentifier, 'add' | 'del' | 'unk'>;

/**
  @class RecordArrayManager
  @internal
*/
class RecordArrayManager {
  declare store: Store;
  declare isDestroying: boolean;
  declare isDestroyed: boolean;
  declare _liveRecordArrays: Dict<RecordArray>;
  declare _pendingIdentifiers: Dict<ChangeSet>;
  declare _adapterPopulatedRecordArrays: RecordArray[];

  constructor(options: { store: Store }) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._liveRecordArrays = Object.create(null) as Dict<RecordArray>;
    this._pendingIdentifiers = Object.create(null) as Dict<ChangeSet>;
    this._adapterPopulatedRecordArrays = [];
  }

  /**
   * @method getRecordArraysForIdentifier
   * @internal
   * @param {StableIdentifier} param
   * @return {RecordArray} array
   */
  getRecordArraysForIdentifier(identifier: StableRecordIdentifier): Set<AdapterPopulatedRecordArray> {
    let cache = RecordArraysCache.get(identifier);
    if (!cache) {
      cache = new Set();
      RecordArraysCache.set(identifier, cache);
    }
    return cache;
  }

  _flushPendingIdentifiersForModelName(modelName: string, changes: ChangeSet): void {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }
    let identifiersToRemove: StableRecordIdentifier[] = [];
    let cache = this.store._instanceCache;

    changes.forEach((value, key) => {
      if (value === 'unk') {
        let isLoaded = cache.recordIsLoaded(key, true);
        changes.set(key, isLoaded ? 'add' : 'del');
        if (!isLoaded) {
          identifiersToRemove.push(key);
        }
      } else if (value === 'del') {
        identifiersToRemove.push(key);
      }
    });

    let array = this._liveRecordArrays[modelName];
    if (array) {
      // TODO: skip if it only changed
      // process liveRecordArrays
      array._updateState(changes as Map<StableRecordIdentifier, 'add' | 'del'>);
    }

    // process adapterPopulatedRecordArrays
    if (identifiersToRemove.length > 0) {
      removeFromAdapterPopulatedRecordArrays(this.store, identifiersToRemove);
    }
  }

  _flush() {
    let pending = this._pendingIdentifiers;
    this._pendingIdentifiers = Object.create(null) as Dict<ChangeSet>;

    for (let modelName in pending) {
      this._flushPendingIdentifiersForModelName(modelName, pending[modelName]!);
    }
  }

  _syncLiveRecordArray(array: RecordArray, modelName: string) {
    assert(
      `recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`,
      typeof modelName === 'string'
    );
    let pending = this._pendingIdentifiers[modelName];

    if (!pending) {
      return;
    }
    let hasNoPotentialDeletions = pending.size === 0;
    let listSize = this.store.identifierCache._cache.types[modelName]?.lid.size || 0;
    let hasNoInsertionsOrRemovals = listSize === array.length;

    /*
      Ideally the recordArrayManager has knowledge of the changes to be applied to
      liveRecordArrays, and is capable of strategically flushing those changes and applying
      small diffs if desired.  However, until we've refactored recordArrayManager, this dirty
      check prevents us from unnecessarily wiping out live record arrays returned by peekAll.
      */
    if (hasNoPotentialDeletions && hasNoInsertionsOrRemovals) {
      return;
    }

    this._flushPendingIdentifiersForModelName(modelName, pending);
    delete this._pendingIdentifiers[modelName];
  }

  _didUpdateAll(modelName: string): void {
    let recordArray = this._liveRecordArrays[modelName];
    if (recordArray) {
      recordArray.isUpdating = false;
    }
  }

  /**
    Get the `RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @method liveRecordArrayFor
    @internal
    @param {String} modelName
    @return {RecordArray}
  */
  liveRecordArrayFor(modelName: string): RecordArray {
    assert(
      `recordArrayManger.liveRecordArrayFor expects modelName not modelClass as the param`,
      typeof modelName === 'string'
    );

    let array = this._liveRecordArrays[modelName];

    if (array) {
      // if the array already exists, synchronize
      this._syncLiveRecordArray(array, modelName);
    } else {
      // if the array is being newly created merely create it with its initial
      // content already set. This prevents unneeded change events.
      let identifiers = visibleIdentifiersByType(this.store._instanceCache, modelName);
      array = this.createRecordArray(modelName, identifiers);
      this._liveRecordArrays[modelName] = array;
    }

    return array;
  }

  /**
    Create a `RecordArray` for a modelName.

    @method createRecordArray
    @internal
    @param {String} modelName
    @param {Array} [identifiers]
    @return {RecordArray}
  */
  createRecordArray(modelName: string, identifiers: StableRecordIdentifier[] = []): RecordArray {
    assert(
      `recordArrayManger.createRecordArray expects modelName not modelClass as the param`,
      typeof modelName === 'string'
    );

    let array = RecordArray.create({
      modelName,
      content: A(identifiers || []),
      store: this.store,
      isLoaded: true,
      manager: this,
    });

    return array;
  }

  /**
    Create a `AdapterPopulatedRecordArray` for a modelName with given query.

    @method createAdapterPopulatedRecordArray
    @internal
    @param {String} modelName
    @param {Object} query
    @return {AdapterPopulatedRecordArray}
  */
  createAdapterPopulatedRecordArray(
    modelName: string,
    query: Dict<unknown> | undefined,
    identifiers: StableRecordIdentifier[],
    payload?: CollectionResourceDocument
  ): AdapterPopulatedRecordArray {
    assert(
      `recordArrayManger.createAdapterPopulatedRecordArray expects modelName not modelClass as the first param, received ${modelName}`,
      typeof modelName === 'string'
    );

    let array: AdapterPopulatedRecordArray;
    if (Array.isArray(identifiers)) {
      array = AdapterPopulatedRecordArray.create({
        modelName,
        query: query,
        content: A(identifiers),
        store: this.store,
        manager: this,
        isLoaded: true,
        isUpdating: false,
        // TODO this assign kills the root reference but a deep-copy would be required
        // for both meta and links to actually not be by-ref. We whould likely change
        // this to a dev-only deep-freeze.
        meta: Object.assign({} as Meta, payload?.meta),
        links: Object.assign({}, payload?.links),
      });

      this._associateWithRecordArray(identifiers, array);
    } else {
      array = AdapterPopulatedRecordArray.create({
        modelName,
        query: query,
        content: A<StableRecordIdentifier>(),
        isLoaded: false,
        store: this.store,
        manager: this,
      });
    }

    this._adapterPopulatedRecordArrays.push(array);

    return array;
  }

  /**
    Unregister a RecordArray.
    So manager will not update this array.

    @method unregisterRecordArray
    @internal
    @param {RecordArray} array
  */
  unregisterRecordArray(array: RecordArray): void {
    let modelName = array.modelName;

    // remove from adapter populated record array
    let removedFromAdapterPopulated = removeFromArray(this._adapterPopulatedRecordArrays, array);

    if (!removedFromAdapterPopulated) {
      let liveRecordArrayForType = this._liveRecordArrays[modelName];
      // unregister live record array
      if (liveRecordArrayForType) {
        if (array === liveRecordArrayForType) {
          delete this._liveRecordArrays[modelName];
        }
      }
    }
  }

  /**
   * @method _associateWithRecordArray
   * @internal
   * @param {StableIdentifier} identifiers
   * @param {RecordArray} array
   */
  _associateWithRecordArray(identifiers: StableRecordIdentifier[], array: AdapterPopulatedRecordArray): void {
    for (let i = 0, l = identifiers.length; i < l; i++) {
      let identifier = identifiers[i];
      let recordArrays = this.getRecordArraysForIdentifier(identifier);
      recordArrays.add(array);
    }
  }

  _getPendingForType(identifier: StableRecordIdentifier) {
    if (
      (!this._liveRecordArrays[identifier.type] && !RecordArraysCache.has(identifier)) ||
      this.isDestroying ||
      this.isDestroyed
    ) {
      return;
    }

    let modelName = identifier.type;
    let pending = this._pendingIdentifiers;
    return (pending[modelName] = pending[modelName] || new Map());
  }

  identifierAdded(identifier: StableRecordIdentifier): void {
    let models = this._getPendingForType(identifier);
    if (models) {
      models.set(identifier, 'add');
      if (models.size > 1) {
        return;
      }

      // TODO do we still need this schedule?
      // eslint-disable-next-line @typescript-eslint/unbound-method
      emberBackburner.schedule('actions', this, this._flush);
    }
  }

  identifierRemoved(identifier: StableRecordIdentifier): void {
    let models = this._getPendingForType(identifier);
    if (models) {
      models.set(identifier, 'del');
      if (models.size > 1) {
        return;
      }

      // TODO do we still need this schedule?
      // eslint-disable-next-line @typescript-eslint/unbound-method
      emberBackburner.schedule('actions', this, this._flush);
    }
  }

  identifierChanged(identifier: StableRecordIdentifier): void {
    let models = this._getPendingForType(identifier);
    if (models) {
      models.set(identifier, 'unk');
      if (models.size > 1) {
        return;
      }

      // TODO do we still need this schedule?
      // eslint-disable-next-line @typescript-eslint/unbound-method
      emberBackburner.schedule('actions', this, this._flush);
    }
  }

  willDestroy() {
    Object.keys(this._liveRecordArrays).forEach((modelName) => this._liveRecordArrays[modelName]!.destroy());
    this._adapterPopulatedRecordArrays.forEach((entry) => entry.destroy());
    this.isDestroyed = true;
  }

  destroy() {
    this.isDestroying = true;
    // TODO do we still need this schedule?
    // eslint-disable-next-line @typescript-eslint/unbound-method
    emberBackburner.schedule('actions', this, this.willDestroy);
  }
}

function removeFromArray(array: RecordArray[], item: RecordArray): boolean {
  let index = array.indexOf(item);

  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }

  return false;
}

function removeFromAdapterPopulatedRecordArrays(store: Store, identifiers: StableRecordIdentifier[]): void {
  for (let i = 0; i < identifiers.length; i++) {
    removeFromAll(store, identifiers[i]);
  }
}

function removeFromAll(store: Store, identifier: StableRecordIdentifier): void {
  const recordArrays = RecordArraysCache.get(identifier);

  if (recordArrays) {
    recordArrays.forEach(function (recordArray: AdapterPopulatedRecordArray) {
      recordArray._removeIdentifiers([identifier]);
    });

    recordArrays.clear();
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
