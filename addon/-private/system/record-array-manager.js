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
      defaultValue: modelClass => this.createRecordArray(modelClass)
    });

    this.changedRecords = [];
    this._adapterPopulatedRecordArrays = [];
  },

  recordDidChange(record) {
    heimdall.increment(recordDidChange);
    if (this.changedRecords.push(record) !== 1) { return; }

    emberRun.schedule('actions', this, this.updateRecordArrays);
  },

  recordArraysForRecord(record) {
    heimdall.increment(recordArraysForRecord);
    record._recordArrays = record._recordArrays || OrderedSet.create();
    return record._recordArrays;
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

  _recordWasDeleted(record) {
    heimdall.increment(_recordWasDeleted);
    let recordArrays = record._recordArrays;

    if (!recordArrays) { return; }

    recordArrays.forEach(array => array._removeInternalModels([record]));

    record._recordArrays = null;
  },

  _recordWasChanged(record) {
    heimdall.increment(_recordWasChanged);
    let typeClass = record.type;
    let recordArrays = this.filteredRecordArrays.get(typeClass);
    let filter;
    recordArrays.forEach(array => {
      filter = get(array, 'filterFunction');
      this.updateFilterRecordArray(array, filter, typeClass, record);
    });
  },

  //Need to update live arrays on loading
  recordWasLoaded(record) {
    heimdall.increment(recordWasLoaded);
    let typeClass = record.type;
    let recordArrays = this.filteredRecordArrays.get(typeClass);
    let filter;

    recordArrays.forEach(array => {
      filter = get(array, 'filterFunction');
      this.updateFilterRecordArray(array, filter, typeClass, record);
    });

    if (this.liveRecordArrays.has(typeClass)) {
      let liveRecordArray = this.liveRecordArrays.get(typeClass);
      this._addInternalModelToRecordArray(liveRecordArray, record);
    }
  },

  /**
    Update an individual filter.

    @method updateFilterRecordArray
    @param {DS.FilteredRecordArray} array
    @param {Function} filter
    @param {DS.Model} modelClass
    @param {InternalModel} internalModel
  */
  updateFilterRecordArray(array, filter, modelClass, internalModel) {
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

  syncLiveRecordArray(array, modelClass) {
    let hasNoPotentialDeletions = this.changedRecords.length === 0;
    let typeMap = this.store.typeMapFor(modelClass);
    let hasNoInsertionsOrRemovals = typeMap.records.length === array.length;

    /*
      Ideally the recordArrayManager has knowledge of the changes to be applied to
      liveRecordArrays, and is capable of strategically flushing those changes and applying
      small diffs if desired.  However, until we've refactored recordArrayManager, this dirty
      check prevents us from unnecessarily wiping out live record arrays returned by peekAll.
     */
    if (hasNoPotentialDeletions && hasNoInsertionsOrRemovals) {
      return;
    }

    this.populateLiveRecordArray(array, modelClass);
  },

  populateLiveRecordArray(array, modelClass) {
    heimdall.increment(populateLiveRecordArray);
    let typeMap = this.store.typeMapFor(modelClass);
    let records = typeMap.records;
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
    @param {Class} modelClass
    @param {Function} filter
  */
  updateFilter(array, modelClass, filter) {
    heimdall.increment(updateFilter);
    let typeMap = this.store.typeMapFor(modelClass);
    let records = typeMap.records;
    let record;

    for (let i = 0; i < records.length; i++) {
      record = records[i];

      if (!record.isDeleted() && !record.isEmpty()) {
        this.updateFilterRecordArray(array, filter, modelClass, record);
      }
    }
  },

  /**
    Get the `DS.RecordArray` for a type, which contains all loaded records of
    given type.

    @method liveRecordArrayFor
    @param {Class} typeClass
    @return {DS.RecordArray}
  */
  liveRecordArrayFor(typeClass) {
    heimdall.increment(liveRecordArrayFor);
    return this.liveRecordArrays.get(typeClass);
  },

  /**
    Create a `DS.RecordArray` for a type.

    @method createRecordArray
    @param {Class} modelClass
    @return {DS.RecordArray}
  */
  createRecordArray(modelClass) {
    heimdall.increment(createRecordArray);
    return RecordArray.create({
      type: modelClass,
      content: Ember.A(),
      store: this.store,
      isLoaded: true,
      manager: this
    });
  },

  /**
    Create a `DS.FilteredRecordArray` for a type and register it for updates.

    @method createFilteredRecordArray
    @param {DS.Model} typeClass
    @param {Function} filter
    @param {Object} query (optional
    @return {DS.FilteredRecordArray}
  */
  createFilteredRecordArray(typeClass, filter, query) {
    heimdall.increment(createFilteredRecordArray);
    let array = FilteredRecordArray.create({
      query: query,
      type: typeClass,
      content: Ember.A(),
      store: this.store,
      manager: this,
      filterFunction: filter
    });

    this.registerFilteredRecordArray(array, typeClass, filter);

    return array;
  },

  /**
    Create a `DS.AdapterPopulatedRecordArray` for a type with given query.

    @method createAdapterPopulatedRecordArray
    @param {DS.Model} typeClass
    @param {Object} query
    @return {DS.AdapterPopulatedRecordArray}
  */
  createAdapterPopulatedRecordArray(typeClass, query) {
    heimdall.increment(createAdapterPopulatedRecordArray);
    let array = AdapterPopulatedRecordArray.create({
      type: typeClass,
      query: query,
      content: Ember.A(),
      store: this.store,
      manager: this
    });

    this._adapterPopulatedRecordArrays.push(array);

    return array;
  },

  /**
    Register a RecordArray for a given type to be backed by
    a filter function. This will cause the array to update
    automatically when records of that type change attribute
    values or states.

    @method registerFilteredRecordArray
    @param {DS.RecordArray} array
    @param {DS.Model} typeClass
    @param {Function} filter
  */
  registerFilteredRecordArray(array, typeClass, filter) {
    heimdall.increment(registerFilteredRecordArray);
    let recordArrays = this.filteredRecordArrays.get(typeClass);
    recordArrays.push(array);

    this.updateFilter(array, typeClass, filter);
  },

  /**
    Unregister a RecordArray.
    So manager will not update this array.

    @method unregisterRecordArray
    @param {DS.RecordArray} array
  */
  unregisterRecordArray(array) {
    heimdall.increment(unregisterRecordArray);

    let typeClass = array.type;

    // unregister filtered record array
    let recordArrays = this.filteredRecordArrays.get(typeClass);
    let removedFromFiltered = remove(recordArrays, array);

    // remove from adapter populated record array
    let removedFromAdapterPopulated = remove(this._adapterPopulatedRecordArrays, array);

    if (!removedFromFiltered && !removedFromAdapterPopulated) {

      // unregister live record array
      if (this.liveRecordArrays.has(typeClass)) {
        let liveRecordArrayForType = this.liveRecordArrayFor(typeClass);
        if (array === liveRecordArrayForType) {
          this.liveRecordArrays.delete(typeClass);
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
