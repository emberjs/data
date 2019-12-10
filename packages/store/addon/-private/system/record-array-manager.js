/**
  @module @ember-data/store
*/

import { A } from '@ember/array';
import { assert } from '@ember/debug';
import { get, set } from '@ember/object';
import { assign } from '@ember/polyfills';
import { run as emberRunloop } from '@ember/runloop';

import { AdapterPopulatedRecordArray, RecordArray } from './record-arrays';
import { internalModelFactoryFor } from './store/internal-model-factory';

const emberRun = emberRunloop.backburner;

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
    this._adapterPopulatedRecordArrays = [];
  }

  recordDidChange(internalModel) {
    let modelName = internalModel.modelName;

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

  _flushPendingInternalModelsForModelName(modelName, internalModels) {
    let modelsToRemove = [];

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
      updateLiveRecordArray(array, internalModels);
    }

    // process adapterPopulatedRecordArrays
    if (modelsToRemove.length > 0) {
      removeFromAdapterPopulatedRecordArrays(modelsToRemove);
    }
  }

  _flush() {
    let pending = this._pending;
    this._pending = Object.create(null);

    for (let modelName in pending) {
      this._flushPendingInternalModelsForModelName(modelName, pending[modelName]);
    }
  }

  _syncLiveRecordArray(array, modelName) {
    assert(
      `recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`,
      typeof modelName === 'string'
    );
    let pending = this._pending[modelName];
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
      this._flushPendingInternalModelsForModelName(modelName, pending);
      delete this._pending[modelName];
    }

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

    let array = RecordArray.create({
      modelName,
      content: A(content || []),
      store: this.store,
      isLoaded: true,
      manager: this,
    });

    if (Array.isArray(content)) {
      associateWithRecordArray(content, array);
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

      associateWithRecordArray(internalModels, array);
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

  _associateWithRecordArray(internalModels, array) {
    associateWithRecordArray(internalModels, array);
  }

  willDestroy() {
    Object.keys(this._liveRecordArrays).forEach(modelName => this._liveRecordArrays[modelName].destroy());
    this._adapterPopulatedRecordArrays.forEach(destroy);
    this.isDestroyed = true;
  }

  destroy() {
    this.isDestroying = true;
    emberRun.schedule('actions', this, this.willDestroy);
  }
}

function destroy(entry) {
  entry.destroy();
}

function remove(array, item) {
  let index = array.indexOf(item);

  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }

  return false;
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

export function associateWithRecordArray(internalModels, array) {
  for (let i = 0, l = internalModels.length; i < l; i++) {
    let internalModel = internalModels[i];
    internalModel._recordArrays.add(array);
  }
}
