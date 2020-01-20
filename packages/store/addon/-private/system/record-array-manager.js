/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { get, set } from '@ember/object';
import { assign } from '@ember/polyfills';
import { run as emberRunloop } from '@ember/runloop';

import { RECORD_ARRAY_MANAGER_IDENTIFIERS, RECORD_ARRAY_MANAGER_LEGACY_COMPAT } from '@ember-data/canary-features';

import isStableIdentifier from '../identifiers/is-stable-identifier';
import { AdapterPopulatedRecordArray, RecordArray } from './record-arrays';
import { internalModelFactoryFor } from './store/internal-model-factory';

const emberRun = emberRunloop.backburner;

const PENDING_FOR_IDENTIFIER = new Set([]);
// store StableIdentifier => Set[RecordArray[]]
const RecordArraysCache = new WeakMap();

/**
  @class RecordArrayManager
  @private
*/
export default class RecordArrayManager {
  constructor(options) {
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._liveRecordArrays = Object.create(null);
    this._pending = Object.create(null);
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      this._pendingIdentifiers = Object.create(null);
    }
    this._adapterPopulatedRecordArrays = [];
  }

  recordDidChange(internalModel) {
    let modelName = internalModel.modelName;

    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      let identifier = getIdentifier(internalModel.identifier);

      if (PENDING_FOR_IDENTIFIER.has(identifier)) {
        return;
      }

      PENDING_FOR_IDENTIFIER.add(identifier);

      let pending = this._pendingIdentifiers;
      let models = (pending[modelName] = pending[modelName] || []);
      if (models.push(identifier) !== 1) {
        return;
      }

      emberRun.schedule('actions', this, this._flush);
    } else {
      if (internalModel._pendingRecordArrayManagerFlush) {
        return;
      }

      internalModel._pendingRecordArrayManagerFlush = true;

      let pending = this._pending;
      let models = (pending[modelName] = pending[modelName] || []);
      if (models.push(internalModel) !== 1) {
        return;
      }

      emberRun.schedule('actions', this, this._flush);
    }
  }

  _flushPendingInternalModelsForModelName(modelName, internalModels) {
    let modelsToRemove = [];

    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      let identifiers = internalModels.map(i => i.identifier);
      this._flushPendingIdentifiersForModelName(modelName, identifiers);
    } else {
      for (let j = 0; j < internalModels.length; j++) {
        let internalModel = internalModels[j];
        // mark internalModels, so they can once again be processed by the
        // recordArrayManager
        internalModel._pendingRecordArrayManagerFlush = false;
        // build up a set of models to ensure we have purged correctly;
        if (internalModel.isHiddenFromRecordArrays()) {
          modelsToRemove.push(internalModel);
        }
      }

      let array = this._liveRecordArrays[modelName];
      if (array) {
        // TODO: skip if it only changed
        // process liveRecordArrays
        if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
          let identifiers = internalModels.map(i => i.identifier);
          updateLiveRecordIdentifiersArray(this.store, array, identifiers);
        } else {
          updateLiveRecordArray(array, internalModels);
        }
      }

      // process adapterPopulatedRecordArrays
      if (modelsToRemove.length > 0) {
        removeFromAdapterPopulatedRecordArrays(modelsToRemove);
      }
    }
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
      PENDING_FOR_IDENTIFIER.delete(i);
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
      updateLiveRecordIdentifiersArray(this.store, array, identifiers);
    }

    // process adapterPopulatedRecordArrays
    if (modelsToRemove.length > 0) {
      removeIdentifiersFromAdapterPopulatedRecordArrays(this.store, modelsToRemove);
    }
  }

  _flush() {
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      let pending = this._pendingIdentifiers;
      this._pendingIdentifiers = Object.create(null);

      for (let modelName in pending) {
        this._flushPendingIdentifiersForModelName(modelName, pending[modelName]);
      }
    } else {
      let pending = this._pending;
      this._pending = Object.create(null);

      for (let modelName in pending) {
        this._flushPendingInternalModelsForModelName(modelName, pending[modelName]);
      }
    }
  }

  _syncLiveRecordArray(array, modelName) {
    assert(
      `recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`,
      typeof modelName === 'string'
    );
    let pending;
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      pending = this._pendingIdentifiers[modelName];
    } else {
      pending = this._pending[modelName];
    }
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
      if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
        this._flushPendingIdentifiersForModelName(modelName, pending);
        delete this._pendingIdentifiers[modelName];
      } else {
        this._flushPendingInternalModelsForModelName(modelName, pending);
        delete this._pending[modelName];
      }
    }

    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      let identifiers = this._visibleIdentifiersByType(modelName);
      let identifiersToAdd = [];
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
    } else {
      let internalModels = this._visibleInternalModelsByType(modelName);
      let modelsToAdd = [];
      for (let i = 0; i < internalModels.length; i++) {
        let internalModel = internalModels[i];
        let recordArrays = internalModel._recordArrays;
        if (recordArrays.has(array) === false) {
          recordArrays.add(array);
          modelsToAdd.push(internalModel);
        }
      }

      if (modelsToAdd.length) {
        array._pushInternalModels(modelsToAdd);
      }
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
      let internalModels = this._visibleInternalModelsByType(modelName);
      array = this.createRecordArray(modelName, internalModels);
      this._liveRecordArrays[modelName] = array;
    }

    return array;
  }

  _visibleInternalModelsByType(modelName) {
    let all = internalModelFactoryFor(this.store).modelMapFor(modelName)._models;
    let visible = [];
    for (let i = 0; i < all.length; i++) {
      let model = all[i];
      if (model.isHiddenFromRecordArrays() === false) {
        visible.push(model);
      }
    }
    return visible;
  }

  _visibleIdentifiersByType(modelName) {
    let all = internalModelFactoryFor(this.store).modelMapFor(modelName).modelIdentifiers;
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
    @param {String} modelName
    @param {Array} _content (optional|private)
    @return {RecordArray}
  */
  createRecordArray(modelName, content) {
    assert(
      `recordArrayManger.createRecordArray expects modelName not modelClass as the param`,
      typeof modelName === 'string'
    );

    let array;
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      let identifiers = content.map(i => i.dientifier);
      array = RecordArray.create({
        modelName,
        content: A(identifiers || []),
        store: this.store,
        isLoaded: true,
        manager: this,
      });

      if (Array.isArray(identifiers)) {
        this._associateWithRecordArray(identifiers, array);
      }
    } else {
      array = RecordArray.create({
        modelName,
        content: A(content || []),
        store: this.store,
        isLoaded: true,
        manager: this,
      });

      if (Array.isArray(content)) {
        this._associateWithRecordArray(content, array);
      }
    }

    return array;
  }

  /**
    Create a `AdapterPopulatedRecordArray` for a modelName with given query.

    @method createAdapterPopulatedRecordArray
    @param {String} modelName
    @param {Object} query
    @return {AdapterPopulatedRecordArray}
  */
  createAdapterPopulatedRecordArray(modelName, query, internalModels, payload) {
    assert(
      `recordArrayManger.createAdapterPopulatedRecordArray expects modelName not modelClass as the first param, received ${modelName}`,
      typeof modelName === 'string'
    );

    let array;
    if (Array.isArray(internalModels)) {
      if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
        let identifiers = internalModels.map(i => i.identifier);
        array = AdapterPopulatedRecordArray.create({
          modelName,
          query: query,
          content: A(identifiers),
          store: this.store,
          manager: this,
          isLoaded: true,
          isUpdating: false,
          meta: assign({}, payload.meta),
          links: assign({}, payload.links),
        });

        this._associateWithRecordArray(identifiers, array);
      } else {
        array = AdapterPopulatedRecordArray.create({
          modelName,
          query: query,
          content: A(internalModels),
          store: this.store,
          manager: this,
          isLoaded: true,
          isUpdating: false,
          meta: assign({}, payload.meta),
          links: assign({}, payload.links),
        });

        this._associateWithRecordArray(internalModels, array);
      }
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
    @param {RecordArray} array
  */
  unregisterRecordArray(array) {
    let modelName = array.modelName;

    // remove from adapter populated record array
    let removedFromAdapterPopulated = remove(this._adapterPopulatedRecordArrays, array);

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
   * @private
   * @param {StableIdentfier} identifiers
   * @param {RecordArray} array
   */
  _associateWithRecordArray(content, array) {
    if (RECORD_ARRAY_MANAGER_IDENTIFIERS) {
      for (let i = 0, l = content.length; i < l; i++) {
        let identifier = content[i];
        identifier = getIdentifier(identifier);
        let recordArrays = this.getRecordArraysForIdentifier(identifier);
        recordArrays.add(array);
      }
    } else {
      for (let i = 0, l = content.length; i < l; i++) {
        let internalModel = content[i];
        internalModel._recordArrays.add(array);
      }
    }
  }

  willDestroy() {
    Object.keys(this._liveRecordArrays).forEach(modelName => this._liveRecordArrays[modelName].destroy());
    this._adapterPopulatedRecordArrays.forEach(entry => entry.destroy);
    this.isDestroyed = true;
  }

  destroy() {
    this.isDestroying = true;
    emberRun.schedule('actions', this, this.willDestroy);
  }
}

function remove(array, item) {
  let index = array.indexOf(item);

  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }

  return false;
}

function updateLiveRecordIdentifiersArray(store, recordArray, identifiers) {
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
}

function updateLiveRecordArray(array, internalModels) {
  let modelsToAdd = [];
  let modelsToRemove = [];

  for (let i = 0; i < internalModels.length; i++) {
    let internalModel = internalModels[i];
    let isDeleted = internalModel.isHiddenFromRecordArrays();
    let recordArrays = internalModel._recordArrays;

    if (!isDeleted && !internalModel.isEmpty()) {
      if (!recordArrays.has(array)) {
        modelsToAdd.push(internalModel);
        recordArrays.add(array);
      }
    }

    if (isDeleted) {
      modelsToRemove.push(internalModel);
      recordArrays.delete(array);
    }
  }

  if (modelsToAdd.length > 0) {
    array._pushInternalModels(modelsToAdd);
  }
  if (modelsToRemove.length > 0) {
    array._removeInternalModels(modelsToRemove);
  }
}

function removeFromAdapterPopulatedRecordArrays(internalModels) {
  for (let i = 0; i < internalModels.length; i++) {
    removeFromAll(internalModels[i]);
  }
}

function removeFromAll(internalModel) {
  const recordArrays = internalModel._recordArrays;

  recordArrays.forEach(function(recordArray) {
    recordArray._removeInternalModels([internalModel]);
  });

  recordArrays.clear();
}

function removeIdentifiersFromAdapterPopulatedRecordArrays(store, identifiers) {
  for (let i = 0; i < identifiers.length; i++) {
    removeIdentifiersFromAll(store, identifiers[i]);
  }
}

function getIdentifier(identifier) {
  let i = identifier;
  if (RECORD_ARRAY_MANAGER_LEGACY_COMPAT && !isStableIdentifier(identifier)) {
    // identifier may actually be an internalModel
    // but during materialization we will get an identifier that
    // has already been removed from the identifiers cache yet
    // so it will not behave as if stable. This is a bug we should fix.
    i = identifier.identifier || i;
  }

  return i;
}

function recordArraysForIdentifier(identifier) {
  if (RecordArraysCache.has(identifier)) {
    // return existing Set if exists
    return RecordArraysCache.get(identifier);
  }

  // return workable Set instance
  RecordArraysCache.set(identifier, new Set());
  return RecordArraysCache.get(identifier);
}

function shouldIncludeInRecordArrays(store, identifier) {
  const cache = internalModelFactoryFor(store);
  const internalModel = cache.peek(identifier);

  if (internalModel === null) {
    return false;
  }
  return !internalModel.isHiddenFromRecordArrays();
}

function pushIdentifiers(recordArray, identifiers, cache) {
  recordArray._pushIdentifiers(identifiers);
}

function removeIdentifiers(recordArray, identifiers, cache) {
  recordArray._removeIdentifiers(identifiers);
}

function removeIdentifiersFromAll(store, identifier) {
  identifier = getIdentifier(identifier);
  const recordArrays = recordArraysForIdentifier(identifier);
  const cache = internalModelFactoryFor(store);

  recordArrays.forEach(function(recordArray) {
    removeIdentifiers(recordArray, [identifier], cache);
  });

  recordArrays.clear();
}
