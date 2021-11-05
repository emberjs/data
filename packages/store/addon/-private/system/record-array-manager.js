/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { get, set } from '@ember/object';
import { _backburner as emberBackburner } from '@ember/runloop';

import { REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT } from '@ember-data/canary-features';

import isStableIdentifier from '../identifiers/is-stable-identifier';
import { AdapterPopulatedRecordArray, RecordArray } from './record-arrays';
import { internalModelFactoryFor } from './store/internal-model-factory';

const RecordArraysCache = new WeakMap();

export function recordArraysForIdentifier(identifierOrInternalModel) {
  if (RecordArraysCache.has(identifierOrInternalModel)) {
    // return existing Set if exists
    return RecordArraysCache.get(identifierOrInternalModel);
  }

  // returns workable Set instance
  RecordArraysCache.set(identifierOrInternalModel, new Set());
  return RecordArraysCache.get(identifierOrInternalModel);
}

const pendingForIdentifier = new Set([]);
const IMDematerializing = new WeakMap();

const getIdentifier = function getIdentifier(identifierOrInternalModel) {
  let i = identifierOrInternalModel;
  if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT && !isStableIdentifier(identifierOrInternalModel)) {
    // identifier may actually be an internalModel
    // but during materialization we will get an identifier that
    // has already been removed from the identifiers cache yet
    // so it will not behave as if stable. This is a bug we should fix.
    i = identifierOrInternalModel.identifier || i;
  }

  return i;
};

// REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT only
const peekIMCache = function peekIMCache(cache, identifier) {
  if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT) {
    let im = IMDematerializing.get(identifier);
    if (im === undefined) {
      // if not im._isDematerializing
      im = cache.peek(identifier);
    }

    return im;
  }

  return cache.peek(identifier);
};

const shouldIncludeInRecordArrays = function shouldIncludeInRecordArrays(store, identifier) {
  const cache = internalModelFactoryFor(store);
  const internalModel = cache.peek(identifier);

  if (internalModel === null) {
    return false;
  }
  return !internalModel.isHiddenFromRecordArrays();
};

/**
  @class RecordArrayManager
  @internal
*/
class RecordArrayManager {
  constructor(options) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._liveRecordArrays = Object.create(null);
    this._pendingIdentifiers = Object.create(null);
    this._adapterPopulatedRecordArrays = [];
  }

  /**
   * @method getRecordArraysForIdentifier
   * @internal
   * @param {StableIdentifier} param
   * @return {RecordArray} array
   */
  getRecordArraysForIdentifier(identifier) {
    return recordArraysForIdentifier(identifier);
  }

  _flushPendingIdentifiersForModelName(modelName, identifiers) {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }
    let modelsToRemove = [];

    for (let j = 0; j < identifiers.length; j++) {
      let i = identifiers[j];
      // mark identifiers, so they can once again be processed by the
      // recordArrayManager
      pendingForIdentifier.delete(i);
      // build up a set of models to ensure we have purged correctly;
      let isIncluded = shouldIncludeInRecordArrays(this.store, i);
      if (!isIncluded) {
        modelsToRemove.push(i);
      }
    }

    let array = this._liveRecordArrays[modelName];
    if (array) {
      // TODO: skip if it only changed
      // process liveRecordArrays
      updateLiveRecordArray(this.store, array, identifiers);
    }

    // process adapterPopulatedRecordArrays
    if (modelsToRemove.length > 0) {
      removeFromAdapterPopulatedRecordArrays(this.store, modelsToRemove);
    }
  }

  _flush() {
    let pending = this._pendingIdentifiers;
    this._pendingIdentifiers = Object.create(null);

    for (let modelName in pending) {
      this._flushPendingIdentifiersForModelName(modelName, pending[modelName]);
    }
  }

  _syncLiveRecordArray(array, modelName) {
    assert(
      `recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`,
      typeof modelName === 'string'
    );
    let pending = this._pendingIdentifiers[modelName];
    let hasPendingChanges = Array.isArray(pending);
    let hasNoPotentialDeletions = !hasPendingChanges || pending.length === 0;
    let map = internalModelFactoryFor(this.store).modelMapFor(modelName);
    let hasNoInsertionsOrRemovals = get(map, 'length') === get(array, 'length');

    /*
      Ideally the recordArrayManager has knowledge of the changes to be applied to
      liveRecordArrays, and is capable of strategically flushing those changes and applying
      small diffs if desired.  However, until we've refactored recordArrayManager, this dirty
      check prevents us from unnecessarily wiping out live record arrays returned by peekAll.
      */
    if (hasNoPotentialDeletions && hasNoInsertionsOrRemovals) {
      return;
    }

    if (hasPendingChanges) {
      this._flushPendingIdentifiersForModelName(modelName, pending);
      delete this._pendingIdentifiers[modelName];
    }

    let identifiers = this._visibleIdentifiersByType(modelName);
    let modelsToAdd = [];
    for (let i = 0; i < identifiers.length; i++) {
      let identifier = identifiers[i];
      let recordArrays = recordArraysForIdentifier(identifier);
      if (recordArrays.has(array) === false) {
        recordArrays.add(array);
        modelsToAdd.push(identifier);
      }
    }

    if (modelsToAdd.length) {
      array._pushIdentifiers(modelsToAdd);
    }
  }

  _didUpdateAll(modelName) {
    let recordArray = this._liveRecordArrays[modelName];
    if (recordArray) {
      set(recordArray, 'isUpdating', false);
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
  liveRecordArrayFor(modelName) {
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

  _visibleIdentifiersByType(modelName) {
    let all = internalModelFactoryFor(this.store).modelMapFor(modelName).recordIdentifiers;
    let visible = [];
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
  createRecordArray(modelName, identifiers) {
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
  createAdapterPopulatedRecordArray(modelName, query, identifiers, payload) {
    assert(
      `recordArrayManger.createAdapterPopulatedRecordArray expects modelName not modelClass as the first param, received ${modelName}`,
      typeof modelName === 'string'
    );

    let array;
    if (Array.isArray(identifiers)) {
      array = AdapterPopulatedRecordArray.create({
        modelName,
        query: query,
        content: A(identifiers),
        store: this.store,
        manager: this,
        isLoaded: true,
        isUpdating: false,
        meta: { ...payload.meta },
        links: { ...payload.links },
      });

      this._associateWithRecordArray(identifiers, array);
    } else {
      array = AdapterPopulatedRecordArray.create({
        modelName,
        query: query,
        content: A(),
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
  unregisterRecordArray(array) {
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
  _associateWithRecordArray(identifiers, array) {
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
  recordDidChange(identifier) {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }
    let modelName = identifier.type;
    identifier = getIdentifier(identifier);

    if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT) {
      const cache = internalModelFactoryFor(this.store);
      const im = peekIMCache(cache, identifier);
      if (im && im._isDematerializing) {
        IMDematerializing.set(identifier, im);
      }
    }

    if (pendingForIdentifier.has(identifier)) {
      return;
    }

    pendingForIdentifier.add(identifier);

    let pending = this._pendingIdentifiers;
    let models = (pending[modelName] = pending[modelName] || []);
    if (models.push(identifier) !== 1) {
      return;
    }

    emberBackburner.schedule('actions', this, this._flush);
  }

  willDestroy() {
    Object.keys(this._liveRecordArrays).forEach((modelName) => this._liveRecordArrays[modelName].destroy());
    this._adapterPopulatedRecordArrays.forEach((entry) => entry.destroy());
    this.isDestroyed = true;
  }

  destroy() {
    this.isDestroying = true;
    emberBackburner.schedule('actions', this, this.willDestroy);
  }
}

const removeFromArray = function removeFromArray(array, item) {
  let index = array.indexOf(item);

  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }

  return false;
};

const updateLiveRecordArray = function updateLiveRecordArray(store, recordArray, identifiers) {
  let identifiersToAdd = [];
  let identifiersToRemove = [];

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
    pushIdentifiers(recordArray, identifiersToAdd, internalModelFactoryFor(store));
  }
  if (identifiersToRemove.length > 0) {
    removeIdentifiers(recordArray, identifiersToRemove, internalModelFactoryFor(store));
  }
};

const pushIdentifiers = function pushIdentifiers(recordArray, identifiers, cache) {
  if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT && !recordArray._pushIdentifiers) {
    // deprecate('not allowed to use this intimate api any more');
    recordArray._pushInternalModels(identifiers.map((i) => peekIMCache(cache, i)));
  } else {
    recordArray._pushIdentifiers(identifiers);
  }
};
const removeIdentifiers = function removeIdentifiers(recordArray, identifiers, cache) {
  if (!REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT && !recordArray._removeIdentifiers) {
    // deprecate('not allowed to use this intimate api any more');
    recordArray._removeInternalModels(identifiers.map((i) => peekIMCache(cache, i)));
  } else {
    recordArray._removeIdentifiers(identifiers);
  }
};

const removeFromAdapterPopulatedRecordArrays = function removeFromAdapterPopulatedRecordArrays(store, identifiers) {
  for (let i = 0; i < identifiers.length; i++) {
    removeFromAll(store, identifiers[i]);
  }
};

const removeFromAll = function removeFromAll(store, identifier) {
  identifier = getIdentifier(identifier);
  const recordArrays = recordArraysForIdentifier(identifier);
  const cache = internalModelFactoryFor(store);

  recordArrays.forEach(function (recordArray) {
    removeIdentifiers(recordArray, [identifier], cache);
  });

  recordArrays.clear();
};

export default RecordArrayManager;
