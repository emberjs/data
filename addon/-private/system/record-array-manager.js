/**
  @module ember-data
*/

import { A } from '@ember/array';

import { set, get } from '@ember/object';
import { run as emberRun } from '@ember/runloop';
import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray
} from "./record-arrays";

import cloneNull from "./clone-null";
import { assert } from '@ember/debug';

const {
  _flush,
  array_flatten,
  array_remove,
  create,
  createAdapterPopulatedRecordArray,
  createFilteredRecordArray,
  createRecordArray,
  liveRecordArrayFor,
  filteredRecordArraysFor,
  recordDidChange,
  registerFilteredRecordArray,
  unregisterRecordArray,
  updateFilter,
  updateFilterRecordArray
} = heimdall.registerMonitor('recordArrayManager',
  '_flush',
  'array_fatten',
  'array_remove',
  'create',
  'createAdapterPopulatedRecordArray',
  'createFilteredRecordArray',
  'createRecordArray',
  'liveRecordArrayFor',
  'filteredRecordArraysFor',
  'recordDidChange',
  'registerFilteredRecordArray',
  'unregisterRecordArray',
  'updateFilter',
  'updateFilterRecordArray'
);

/**
  @class RecordArrayManager
  @namespace DS
  @private
*/
export default class RecordArrayManager {
  constructor(options) {
    heimdall.increment(create);
    this.store = options.store;
    this.isDestroying = false;
    this.isDestroyed = false;
    this._filteredRecordArrays = Object.create(null);
    this._liveRecordArrays = Object.create(null);
    this._pending = Object.create(null);
    this._adapterPopulatedRecordArrays = [];
  }

  recordDidChange(internalModel) {
    // TODO: change name
    // TODO: track that it was also a change
    this.internalModelDidChange(internalModel);
  }

  recordWasLoaded(internalModel) {
    // TODO: change name
    // TODO: track that it was also that it was first loaded
    this.internalModelDidChange(internalModel);
  }

  internalModelDidChange(internalModel) {
    heimdall.increment(recordDidChange);

    let modelName = internalModel.modelName;

    if (internalModel._pendingRecordArrayManagerFlush) {
      return;
    }

    internalModel._pendingRecordArrayManagerFlush = true;

    let pending = this._pending;
    let models = pending[modelName] = pending[modelName] || [];
    if (models.push(internalModel) !== 1) {
      return;
    }

    emberRun.schedule('actions', this, this._flush);
  }

  _flush() {
    heimdall.increment(_flush);

    let pending = this._pending;
    this._pending = Object.create(null);
    let modelsToRemove = [];

    for (let modelName in pending) {
      let internalModels = pending[modelName];
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

      // process filteredRecordArrays
      if (this._filteredRecordArrays[modelName]) {
        let recordArrays = this.filteredRecordArraysFor(modelName);
        for (let i = 0; i < recordArrays.length; i++) {
          this.updateFilterRecordArray(recordArrays[i], modelName, internalModels);
        }
      }

      let array = this._liveRecordArrays[modelName];
      if (array) {
        // TODO: skip if it only changed
        // process liveRecordArrays
        this.updateLiveRecordArray(array, internalModels);
      }

      // process adapterPopulatedRecordArrays
      if (modelsToRemove.length > 0) {
        removeFromAdapterPopulatedRecordArrays(modelsToRemove);
      }
    }
  }

  updateLiveRecordArray(array, internalModels) {
    return updateLiveRecordArray(array, internalModels);
  }

  /**
    Update an individual filter.

    @private
    @method updateFilterRecordArray
    @param {DS.FilteredRecordArray} array
    @param {String} modelName
    @param {Array} internalModels
  */
  updateFilterRecordArray(array, modelName, internalModels) {
    heimdall.increment(updateFilterRecordArray);

    let filter = get(array, 'filterFunction');

    let shouldBeInAdded = [];
    let shouldBeRemoved = [];

    for (let i = 0; i < internalModels.length; i++) {
      let internalModel = internalModels[i];
      if (internalModel.isHiddenFromRecordArrays() === false &&
          filter(internalModel.getRecord())) {
        if (internalModel._recordArrays.has(array)) { continue; }
        shouldBeInAdded.push(internalModel);
        internalModel._recordArrays.add(array);
      } else {
        if (internalModel._recordArrays.delete(array)) {
          shouldBeRemoved.push(internalModel);
        }
      }
    }

    if (shouldBeInAdded.length > 0) { array._pushInternalModels(shouldBeInAdded);   }
    if (shouldBeRemoved.length > 0) { array._removeInternalModels(shouldBeRemoved); }
  }

  // TODO: remove, utilize existing flush code but make it flush sync based on 1 modelName
  _syncLiveRecordArray(array, modelName) {
    assert(`recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`, typeof modelName === 'string');
    let hasNoPotentialDeletions = Object.keys(this._pending).length === 0;
    let map = this.store._internalModelsFor(modelName);
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

    array._pushInternalModels(modelsToAdd);
  }

  /**
    This method is invoked if the `filterFunction` property is
    changed on a `DS.FilteredRecordArray`.

    It essentially re-runs the filter from scratch. This same
    method is invoked when the filter is created in th first place.

    @method updateFilter
    @param {Array} array
    @param {String} modelName
    @param {Function} filter
  */
  updateFilter(array, modelName, filter) {
    assert(`recordArrayManger.updateFilter expects modelName not modelClass as the second param, received ${modelName}`, typeof modelName === 'string');
    heimdall.increment(updateFilter);
    let modelMap = this.store._internalModelsFor(modelName);
    let internalModels = modelMap.models;

    this.updateFilterRecordArray(array, filter, internalModels);
  }

  _didUpdateAll(modelName) {
    let recordArray = this._liveRecordArrays[modelName];
    if (recordArray) {
      set(recordArray, 'isUpdating', false);
    }
  }

  /**
    Get the `DS.RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @method liveRecordArrayFor
    @param {String} modelName
    @return {DS.RecordArray}
  */
  liveRecordArrayFor(modelName) {
    assert(`recordArrayManger.liveRecordArrayFor expects modelName not modelClass as the param`, typeof modelName === 'string');

    heimdall.increment(liveRecordArrayFor);

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
    let all = this.store._internalModelsFor(modelName)._models;
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
    Get the `DS.RecordArray` for a modelName, which contains all loaded records of
    given modelName.

    @method filteredRecordArraysFor
    @param {String} modelName
    @return {DS.RecordArray}
  */
  filteredRecordArraysFor(modelName) {
    assert(`recordArrayManger.filteredRecordArraysFor expects modelName not modelClass as the param`, typeof modelName === 'string');

    heimdall.increment(filteredRecordArraysFor);

    return this._filteredRecordArrays[modelName] || (this._filteredRecordArrays[modelName] = []);
  }
  /**
    Create a `DS.RecordArray` for a modelName.

    @method createRecordArray
    @param {String} modelName
    @param {Array} _content (optional|private)
    @return {DS.RecordArray}
  */
  createRecordArray(modelName, content) {
    assert(`recordArrayManger.createRecordArray expects modelName not modelClass as the param`, typeof modelName === 'string');
    heimdall.increment(createRecordArray);

    let array = RecordArray.create({
      modelName,
      content: A(content || []),
      store: this.store,
      isLoaded: true,
      manager: this
    });

    if (Array.isArray(content)) {
      associateWithRecordArray(content, array);
    }

    return array;
  }

  /**
    Create a `DS.FilteredRecordArray` for a modelName and register it for updates.

    @method createFilteredRecordArray
    @param {String} modelName
    @param {Function} filter
    @param {Object} query (optional
    @return {DS.FilteredRecordArray}
  */
  createFilteredRecordArray(modelName, filter, query) {
    assert(`recordArrayManger.createFilteredRecordArray expects modelName not modelClass as the first param, received ${modelName}`, typeof modelName === 'string');

    heimdall.increment(createFilteredRecordArray);
    let array = FilteredRecordArray.create({
      query,
      modelName,
      content: A(),
      store: this.store,
      manager: this,
      filterFunction: filter
    });

    this.registerFilteredRecordArray(array, modelName, filter);

    return array;
  }

  /**
    Create a `DS.AdapterPopulatedRecordArray` for a modelName with given query.

    @method createAdapterPopulatedRecordArray
    @param {String} modelName
    @param {Object} query
    @return {DS.AdapterPopulatedRecordArray}
  */
  createAdapterPopulatedRecordArray(modelName, query, internalModels, payload) {
    heimdall.increment(createAdapterPopulatedRecordArray);
    assert(`recordArrayManger.createAdapterPopulatedRecordArray expects modelName not modelClass as the first param, received ${modelName}`, typeof modelName === 'string');

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
        meta: cloneNull(payload.meta),
        links: cloneNull(payload.links)
      });

      associateWithRecordArray(internalModels, array);
    } else {
      array = AdapterPopulatedRecordArray.create({
        modelName,
        query: query,
        content: A(),
        store: this.store,
        manager: this
      });
    }

    this._adapterPopulatedRecordArrays.push(array);

    return array;
  }

  /**
    Register a RecordArray for a given modelName to be backed by
    a filter function. This will cause the array to update
    automatically when records of that modelName change attribute
    values or states.

    @method registerFilteredRecordArray
    @param {DS.RecordArray} array
    @param {String} modelName
    @param {Function} filter
  */
  registerFilteredRecordArray(array, modelName, filter) {
    heimdall.increment(registerFilteredRecordArray);
    assert(`recordArrayManger.registerFilteredRecordArray expects modelName not modelClass as the second param, received ${modelName}`, typeof modelName === 'string');

    this.filteredRecordArraysFor(modelName).push(array);
    this.updateFilter(array, modelName, filter);
  }

  /**
    Unregister a RecordArray.
    So manager will not update this array.

    @method unregisterRecordArray
    @param {DS.RecordArray} array
  */
  unregisterRecordArray(array) {
    heimdall.increment(unregisterRecordArray);

    let modelName = array.modelName;

    // unregister filtered record array
    let recordArrays = this.filteredRecordArraysFor(modelName);
    let removedFromFiltered = remove(recordArrays, array);

    // remove from adapter populated record array
    let removedFromAdapterPopulated = remove(this._adapterPopulatedRecordArrays, array);

    if (!removedFromFiltered && !removedFromAdapterPopulated) {

      let liveRecordArrayForType = this._liveRecordArrays[modelName];
      // unregister live record array
      if (liveRecordArrayForType) {
        if (array === liveRecordArrayForType) {
          delete this._liveRecordArrays[modelName];
        }
      }
    }
  }

  willDestroy() {
    Object.keys(this._filteredRecordArrays).forEach(modelName => flatten(this._filteredRecordArrays[modelName]).forEach(destroy));
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

function flatten(list) {
  heimdall.increment(array_flatten);
  let length = list.length;
  let result = [];

  for (let i = 0; i < length; i++) {
    result = result.concat(list[i]);
  }

  return result;
}

function remove(array, item) {
  heimdall.increment(array_remove);
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
      recordArrays.delete(array)
    }
  }

  if (modelsToAdd.length > 0)    { array._pushInternalModels(modelsToAdd); }
  if (modelsToRemove.length > 0) { array._removeInternalModels(modelsToRemove); }
}

function removeFromAdapterPopulatedRecordArrays(internalModels) {
  for (let i = 0; i < internalModels.length; i++) {
    let internalModel = internalModels[i];
    let list = internalModel._recordArrays.list;

    for (let j = 0; j < list.length; j++) {
      // TODO: group by arrays, so we can batch remove
      list[j]._removeInternalModels([internalModel]);
    }

    internalModel._recordArrays.clear();
  }
}

export function associateWithRecordArray(internalModels, array) {
  for (let i = 0, l = internalModels.length; i < l; i++) {
    let internalModel = internalModels[i];
    internalModel._recordArrays.add(array);
  }
}
