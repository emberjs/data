/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { set } from '@ember/object';
import { _backburner as emberBackburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

// import isStableIdentifier from '../identifiers/is-stable-identifier';
import type { CollectionResourceDocument, Meta } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { Dict } from '@ember-data/types/q/utils';

import type Store from './core-store';
import { internalModelFactoryFor } from './internal-model-factory';
import AdapterPopulatedRecordArray from './record-arrays/adapter-populated-record-array';
import RecordArray from './record-arrays/record-array';
import WeakCache from './weak-cache';

const RecordArraysCache = new WeakCache<StableRecordIdentifier, Set<RecordArray>>(DEBUG ? 'record-arrays' : '');
RecordArraysCache._generator = () => new Set();
export function recordArraysForIdentifier(identifier: StableRecordIdentifier): Set<RecordArray> {
  return RecordArraysCache.lookup(identifier);
}

const pendingForIdentifier: Set<StableRecordIdentifier> = new Set([]);

function getIdentifier(identifier: StableRecordIdentifier): StableRecordIdentifier {
  // during dematerialization we will get an identifier that
  // has already been removed from the identifiers cache
  // so it will not behave as if stable. This is a bug we should fix.
  // if (!isStableIdentifier(identifierOrInternalModel)) {
  //   console.log({ unstable: i });
  // }

  return identifier;
}

function shouldIncludeInRecordArrays(store: Store, identifier: StableRecordIdentifier): boolean {
  const cache = internalModelFactoryFor(store);
  const internalModel = cache.peek(identifier);

  if (internalModel === null) {
    return false;
  }
  return !internalModel.isHiddenFromRecordArrays();
}

/**
  @class RecordArrayManager
  @internal
*/
class RecordArrayManager {
  declare store: Store;
  declare isDestroying: boolean;
  declare isDestroyed: boolean;
  declare _liveRecordArrays: Dict<RecordArray>;
  declare _pendingIdentifiers: Dict<StableRecordIdentifier[]>;
  declare _adapterPopulatedRecordArrays: RecordArray[];

  constructor(options: { store: Store }) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._liveRecordArrays = Object.create(null) as Dict<RecordArray>;
    this._pendingIdentifiers = Object.create(null) as Dict<StableRecordIdentifier[]>;
    this._adapterPopulatedRecordArrays = [];
  }

  /**
   * @method getRecordArraysForIdentifier
   * @internal
   * @param {StableIdentifier} param
   * @return {RecordArray} array
   */
  getRecordArraysForIdentifier(identifier: StableRecordIdentifier): Set<RecordArray> {
    return recordArraysForIdentifier(identifier);
  }

  _flushPendingIdentifiersForModelName(modelName: string, identifiers: StableRecordIdentifier[]): void {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }
    let identifiersToRemove: StableRecordIdentifier[] = [];

    for (let j = 0; j < identifiers.length; j++) {
      let i = identifiers[j];
      // mark identifiers, so they can once again be processed by the
      // recordArrayManager
      pendingForIdentifier.delete(i);
      // build up a set of models to ensure we have purged correctly;
      let isIncluded = shouldIncludeInRecordArrays(this.store, i);
      if (!isIncluded) {
        identifiersToRemove.push(i);
      }
    }

    let array = this._liveRecordArrays[modelName];
    if (array) {
      // TODO: skip if it only changed
      // process liveRecordArrays
      updateLiveRecordArray(this.store, array, identifiers);
    }

    // process adapterPopulatedRecordArrays
    if (identifiersToRemove.length > 0) {
      removeFromAdapterPopulatedRecordArrays(this.store, identifiersToRemove);
    }
  }

  _flush() {
    let pending = this._pendingIdentifiers;
    this._pendingIdentifiers = Object.create(null) as Dict<StableRecordIdentifier[]>;

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

    if (!Array.isArray(pending)) {
      return;
    }
    let hasNoPotentialDeletions = pending.length === 0;
    let map = internalModelFactoryFor(this.store).modelMapFor(modelName);
    let hasNoInsertionsOrRemovals = map.length === array.length;

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

    let identifiers = this._visibleIdentifiersByType(modelName);
    let identifiersToAdd: StableRecordIdentifier[] = [];
    for (let i = 0; i < identifiers.length; i++) {
      let identifier = identifiers[i];
      let recordArrays = recordArraysForIdentifier(identifier);
      if (recordArrays.has(array) === false) {
        recordArrays.add(array);
        identifiersToAdd.push(identifier);
      }
    }

    if (identifiersToAdd.length) {
      array._pushIdentifiers(identifiersToAdd);
    }
  }

  _didUpdateAll(modelName: string): void {
    let recordArray = this._liveRecordArrays[modelName];
    if (recordArray) {
      set(recordArray, 'isUpdating', false);
      // TODO potentially we should sync here, currently
      // this occurs as a side-effect of individual records updating
      // this._syncLiveRecordArray(recordArray, modelName);
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
      let identifiers = this._visibleIdentifiersByType(modelName);
      array = this.createRecordArray(modelName, identifiers);
      this._liveRecordArrays[modelName] = array;
    }

    return array;
  }

  _visibleIdentifiersByType(modelName: string) {
    let all = internalModelFactoryFor(this.store).modelMapFor(modelName).recordIdentifiers;
    let visible: StableRecordIdentifier[] = [];
    for (let i = 0; i < all.length; i++) {
      let identifier = all[i];
      let shouldInclude = shouldIncludeInRecordArrays(this.store, identifier);

      if (shouldInclude) {
        visible.push(identifier);
      }
    }
    return visible;
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

    if (Array.isArray(identifiers)) {
      this._associateWithRecordArray(identifiers, array);
    }

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
  _associateWithRecordArray(identifiers: StableRecordIdentifier[], array: RecordArray): void {
    for (let i = 0, l = identifiers.length; i < l; i++) {
      let identifier = identifiers[i];
      identifier = getIdentifier(identifier);
      let recordArrays = this.getRecordArraysForIdentifier(identifier);
      recordArrays.add(array);
    }
  }

  /**
    @method recordDidChange
    @internal
  */
  recordDidChange(identifier: StableRecordIdentifier): void {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }
    let modelName = identifier.type;
    identifier = getIdentifier(identifier);

    if (pendingForIdentifier.has(identifier)) {
      return;
    }

    pendingForIdentifier.add(identifier);

    let pending = this._pendingIdentifiers;
    let models = (pending[modelName] = pending[modelName] || []);
    if (models.push(identifier) !== 1) {
      return;
    }

    // TODO do we still need this schedule?
    // eslint-disable-next-line @typescript-eslint/unbound-method
    emberBackburner.schedule('actions', this, this._flush);
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

function updateLiveRecordArray(store: Store, recordArray: RecordArray, identifiers: StableRecordIdentifier[]): void {
  let identifiersToAdd: StableRecordIdentifier[] = [];
  let identifiersToRemove: StableRecordIdentifier[] = [];

  for (let i = 0; i < identifiers.length; i++) {
    let identifier = identifiers[i];
    let shouldInclude = shouldIncludeInRecordArrays(store, identifier);
    let recordArrays = recordArraysForIdentifier(identifier);

    if (shouldInclude) {
      if (!recordArrays.has(recordArray)) {
        identifiersToAdd.push(identifier);
        recordArrays.add(recordArray);
      }
    }

    if (!shouldInclude) {
      identifiersToRemove.push(identifier);
      recordArrays.delete(recordArray);
    }
  }

  if (identifiersToAdd.length > 0) {
    recordArray._pushIdentifiers(identifiersToAdd);
  }
  if (identifiersToRemove.length > 0) {
    recordArray._removeIdentifiers(identifiersToRemove);
  }
}

function removeFromAdapterPopulatedRecordArrays(store: Store, identifiers: StableRecordIdentifier[]): void {
  for (let i = 0; i < identifiers.length; i++) {
    removeFromAll(store, identifiers[i]);
  }
}

function removeFromAll(store: Store, identifier: StableRecordIdentifier): void {
  identifier = getIdentifier(identifier);
  const recordArrays = recordArraysForIdentifier(identifier);

  recordArrays.forEach(function (recordArray) {
    recordArray._removeIdentifiers([identifier]);
  });

  recordArrays.clear();
}

export default RecordArrayManager;
