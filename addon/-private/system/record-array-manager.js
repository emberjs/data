/**
  @module ember-data
*/

import Ember from 'ember';
import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray
} from "ember-data/-private/system/record-arrays";
import OrderedSet from "ember-data/-private/system/ordered-set";
import { assert } from 'ember-data/-private/debug';

const {
  get,
  MapWithDefault,
  run: emberRun
} = Ember;

const {
  _addRecordToRecordArray,
  _recordWasChanged,
  _recordWasDeleted,
  array_flatten,
  array_remove,
  create,
  createAdapterPopulatedRecordArray,
  createFilteredRecordArray,
  createRecordArray,
  liveRecordArrayFor,
  populateLiveRecordArray,
  recordArraysForRecord,
  recordDidChange,
  recordWasLoaded,
  registerFilteredRecordArray,
  unregisterRecordArray,
  updateFilter,
  updateFilterRecordArray,
  updateRecordArrays
} = heimdall.registerMonitor('recordArrayManager',
  '_addInternalModelToRecordArray',
  '_recordWasChanged',
  '_recordWasDeleted',
  'array_fatten',
  'array_remove',
  'create',
  'createAdapterPopulatedRecordArray',
  'createFilteredRecordArray',
  'createRecordArray',
  'liveRecordArrayFor',
  'populateLiveRecordArray',
  'recordArraysForRecord',
  'recordDidChange',
  'recordWasLoaded',
  'registerFilteredRecordArray',
  'unregisterRecordArray',
  'updateFilter',
  'updateFilterRecordArray',
  'updateRecordArrays'
);

/**
  @class RecordArrayManager
  @namespace DS
  @private
  @extends Ember.Object
*/
export default Ember.Object.extend({
  init() {
    heimdall.increment(create);
    this.filteredRecordArrays = MapWithDefault.create({
      defaultValue() { return []; }
    });

    this.liveRecordArrays = MapWithDefault.create({
      defaultValue: modelName => {
        assert(`liveRecordArrays.get expects modelName not modelClass as the param`, typeof modelName === 'string');
        return this.createRecordArray(modelName);
      }
    });

    this.changedRecords = [];
    this._adapterPopulatedRecordArrays = [];
  },

  recordDidChange(record) {
    heimdall.increment(recordDidChange);
    if (this.changedRecords.push(record) !== 1) { return; }

    emberRun.schedule('actions', this, this.updateRecordArrays);
  },

  recordArraysForRecord(internalModel) {
    heimdall.increment(recordArraysForRecord);
    internalModel._recordArrays = internalModel._recordArrays || OrderedSet.create();
    return internalModel._recordArrays;
  },

  /**
    This method is invoked whenever data is loaded into the store by the
    adapter or updated by the adapter, or when a record has changed.

    It updates all record arrays that a record belongs to.

    To avoid thrashing, it only runs at most once per run loop.

    @method updateRecordArrays
  */
  updateRecordArrays() {
    heimdall.increment(updateRecordArrays);
    this.changedRecords.forEach(internalModel => {

      if (internalModel.isDestroyed ||
          internalModel.currentState.stateName === 'root.deleted.saved') {
        this._recordWasDeleted(internalModel);
      } else {
        this._recordWasChanged(internalModel);
      }
    });

    this.changedRecords.length = 0;
  },

  _recordWasDeleted(internalModel) {
    heimdall.increment(_recordWasDeleted);
    let recordArrays = internalModel._recordArrays;

    if (!recordArrays) { return; }

    recordArrays.forEach(array => array._removeInternalModels([internalModel]));

    internalModel._recordArrays = null;
  },

  _recordWasChanged(internalModel) {
    heimdall.increment(_recordWasChanged);
    let modelName = internalModel.modelName;
    let recordArrays = this.filteredRecordArrays.get(modelName);
    let filter;
    recordArrays.forEach(array => {
      filter = get(array, 'filterFunction');
      this.updateFilterRecordArray(array, filter, modelName, internalModel);
    });
  },

  //Need to update live arrays on loading
  recordWasLoaded(internalModel) {
    heimdall.increment(recordWasLoaded);
    let modelName = internalModel.modelName;
    let recordArrays = this.filteredRecordArrays.get(modelName);
    let filter;

    recordArrays.forEach(array => {
      filter = get(array, 'filterFunction');
      this.updateFilterRecordArray(array, filter, modelName, internalModel);
    });

    if (this.liveRecordArrays.has(modelName)) {
      let liveRecordArray = this.liveRecordArrays.get(modelName);
      this._addInternalModelToRecordArray(liveRecordArray, internalModel);
    }
  },

  /**
    Update an individual filter.

    @method updateFilterRecordArray
    @param {DS.FilteredRecordArray} array
    @param {Function} filter
    @param {String} modelName
    @param {InternalModel} internalModel
  */
  updateFilterRecordArray(array, filter, modelName, internalModel) {
    heimdall.increment(updateFilterRecordArray);
    let shouldBeInArray = filter(internalModel.getRecord());
    let recordArrays = this.recordArraysForRecord(internalModel);
    if (shouldBeInArray) {
      this._addInternalModelToRecordArray(array, internalModel);
    } else {
      recordArrays.delete(array);
      array._removeInternalModels([internalModel]);
    }
  },

  _addInternalModelToRecordArray(array, internalModel) {
    heimdall.increment(_addRecordToRecordArray);
    let recordArrays = this.recordArraysForRecord(internalModel);
    if (!recordArrays.has(array)) {
      array._pushInternalModels([internalModel]);
      recordArrays.add(array);
    }
  },

  syncLiveRecordArray(array, modelName) {
    assert(`recordArrayManger.syncLiveRecordArray expects modelName not modelClass as the second param`, typeof modelName === 'string');
    let hasNoPotentialDeletions = this.changedRecords.length === 0;
    let recordMap = this.store._recordMapFor(modelName);
    let hasNoInsertionsOrRemovals = recordMap.length === array.length;

    /*
      Ideally the recordArrayManager has knowledge of the changes to be applied to
      liveRecordArrays, and is capable of strategically flushing those changes and applying
      small diffs if desired.  However, until we've refactored recordArrayManager, this dirty
      check prevents us from unnecessarily wiping out live record arrays returned by peekAll.
     */
    if (hasNoPotentialDeletions && hasNoInsertionsOrRemovals) {
      return;
    }

    this.populateLiveRecordArray(array, modelName);
  },

  populateLiveRecordArray(array, modelName) {
    assert(`recordArrayManger.populateLiveRecordArray expects modelName not modelClass as the second param`, typeof modelName === 'string');
    heimdall.increment(populateLiveRecordArray);
    let recordMap = this.store._recordMapFor(modelName);
    let records = recordMap.records;
    let record;

    for (let i = 0; i < records.length; i++) {
      record = records[i];

      if (!record.isDeleted() && !record.isEmpty()) {
        this._addInternalModelToRecordArray(array, record);
      }
    }
  },

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
    let recordMap = this.store._recordMapFor(modelName);
    let records = recordMap.records;
    let record;

    for (let i = 0; i < records.length; i++) {
      record = records[i];

      if (!record.isDeleted() && !record.isEmpty()) {
        this.updateFilterRecordArray(array, filter, modelName, record);
      }
    }
  },

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
    return this.liveRecordArrays.get(modelName);
  },

  /**
    Create a `DS.RecordArray` for a modelName.

    @method createRecordArray
    @param {String} modelName
    @return {DS.RecordArray}
  */
  createRecordArray(modelName) {
    assert(`recordArrayManger.createRecordArray expects modelName not modelClass as the param`, typeof modelName === 'string');
    heimdall.increment(createRecordArray);
    return RecordArray.create({
      modelName,
      content: Ember.A(),
      store: this.store,
      isLoaded: true,
      manager: this
    });
  },

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
      content: Ember.A(),
      store: this.store,
      manager: this,
      filterFunction: filter
    });

    this.registerFilteredRecordArray(array, modelName, filter);

    return array;
  },

  /**
    Create a `DS.AdapterPopulatedRecordArray` for a modelName with given query.

    @method createAdapterPopulatedRecordArray
    @param {String} modelName
    @param {Object} query
    @return {DS.AdapterPopulatedRecordArray}
  */
  createAdapterPopulatedRecordArray(modelName, query) {
    heimdall.increment(createAdapterPopulatedRecordArray);
    assert(`recordArrayManger.createAdapterPopulatedRecordArray expects modelName not modelClass as the first param, received ${modelName}`, typeof modelName === 'string');

    let array = AdapterPopulatedRecordArray.create({
      modelName,
      query: query,
      content: Ember.A(),
      store: this.store,
      manager: this
    });

    this._adapterPopulatedRecordArrays.push(array);

    return array;
  },

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

    let recordArrays = this.filteredRecordArrays.get(modelName);
    recordArrays.push(array);

    this.updateFilter(array, modelName, filter);
  },

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
    let recordArrays = this.filteredRecordArrays.get(modelName);
    let removedFromFiltered = remove(recordArrays, array);

    // remove from adapter populated record array
    let removedFromAdapterPopulated = remove(this._adapterPopulatedRecordArrays, array);

    if (!removedFromFiltered && !removedFromAdapterPopulated) {

      // unregister live record array
      if (this.liveRecordArrays.has(modelName)) {
        let liveRecordArrayForType = this.liveRecordArrayFor(modelName);
        if (array === liveRecordArrayForType) {
          this.liveRecordArrays.delete(modelName);
        }
      }
    }
  },

  willDestroy() {
    this._super(...arguments);

    this.filteredRecordArrays.forEach(value => flatten(value).forEach(destroy));
    this.liveRecordArrays.forEach(destroy);
    this._adapterPopulatedRecordArrays.forEach(destroy);
  }
});

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
