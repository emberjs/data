/**
  @module ember-data
*/

import {
  RecordArray,
  FilteredRecordArray,
  AdapterPopulatedRecordArray
} from "ember-data/system/record-arrays";
import {
  MapWithDefault
} from "ember-data/system/map";
import OrderedSet from "ember-data/system/ordered-set";
var get = Ember.get;

/**
  @class RecordArrayManager
  @namespace DS
  @private
  @extends Ember.Object
*/
export default Ember.Object.extend({
  init: function() {
    this.filteredRecordArrays = MapWithDefault.create({
      defaultValue: function() { return []; }
    });

    this.liveRecordArrays = MapWithDefault.create({
      defaultValue: (typeClass) => {
        return this.createRecordArray(typeClass);
      }
    });

    this.changedRecords = [];
    this._adapterPopulatedRecordArrays = [];
  },

  recordDidChange: function(record) {
    if (this.changedRecords.push(record) !== 1) { return; }

    Ember.run.schedule('actions', this, this.updateRecordArrays);
  },

  recordArraysForRecord: function(record) {
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
  updateRecordArrays: function() {
    this.changedRecords.forEach((internalModel) => {
      if (get(internalModel, 'record.isDestroyed') || get(internalModel, 'record.isDestroying') ||
           (get(internalModel, 'currentState.stateName') === 'root.deleted.saved')) {
        this._recordWasDeleted(internalModel);
      } else {
        this._recordWasChanged(internalModel);
      }
    });

    this.changedRecords.length = 0;
  },

  _recordWasDeleted: function (record) {
    var recordArrays = record._recordArrays;

    if (!recordArrays) { return; }

    recordArrays.forEach((array) => array.removeInternalModel(record));

    record._recordArrays = null;
  },


  _recordWasChanged: function (record) {
    var typeClass = record.type;
    var recordArrays = this.filteredRecordArrays.get(typeClass);
    var filter;
    recordArrays.forEach((array) => {
      filter = get(array, 'filterFunction');
      this.updateFilterRecordArray(array, filter, typeClass, record);
    });
  },

  //Need to update live arrays on loading
  recordWasLoaded: function(record) {
    var typeClass = record.type;
    var recordArrays = this.filteredRecordArrays.get(typeClass);
    var filter;

    recordArrays.forEach((array) => {
      filter = get(array, 'filterFunction');
      this.updateFilterRecordArray(array, filter, typeClass, record);
    });

    if (this.liveRecordArrays.has(typeClass)) {
      var liveRecordArray = this.liveRecordArrays.get(typeClass);
      this._addRecordToRecordArray(liveRecordArray, record);
    }
  },
  /**
    Update an individual filter.

    @method updateFilterRecordArray
    @param {DS.FilteredRecordArray} array
    @param {Function} filter
    @param {DS.Model} typeClass
    @param {InternalModel} record
  */
  updateFilterRecordArray: function(array, filter, typeClass, record) {
    var shouldBeInArray = filter(record.getRecord());
    var recordArrays = this.recordArraysForRecord(record);
    if (shouldBeInArray) {
      this._addRecordToRecordArray(array, record);
    } else {
      recordArrays.delete(array);
      array.removeInternalModel(record);
    }
  },

  _addRecordToRecordArray: function(array, record) {
    var recordArrays = this.recordArraysForRecord(record);
    if (!recordArrays.has(array)) {
      array.addInternalModel(record);
      recordArrays.add(array);
    }
  },

  populateLiveRecordArray: function(array, modelName) {
    var typeMap = this.store.typeMapFor(modelName);
    var records = typeMap.records;
    var record;

    for (var i = 0, l = records.length; i < l; i++) {
      record = records[i];

      if (!record.isDeleted() && !record.isEmpty()) {
        this._addRecordToRecordArray(array, record);
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
  updateFilter: function(array, modelName, filter) {
    var typeMap = this.store.typeMapFor(modelName);
    var records = typeMap.records;
    var record;

    for (var i = 0, l = records.length; i < l; i++) {
      record = records[i];

      if (!record.isDeleted() && !record.isEmpty()) {
        this.updateFilterRecordArray(array, filter, modelName, record);
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
  liveRecordArrayFor: function(typeClass) {
    return this.liveRecordArrays.get(typeClass);
  },

  /**
    Create a `DS.RecordArray` for a type.

    @method createRecordArray
    @param {Class} typeClass
    @return {DS.RecordArray}
  */
  createRecordArray: function(typeClass) {
    var array = RecordArray.create({
      type: typeClass,
      content: Ember.A(),
      store: this.store,
      isLoaded: true,
      manager: this
    });

    return array;
  },

  /**
    Create a `DS.FilteredRecordArray` for a type and register it for updates.

    @method createFilteredRecordArray
    @param {DS.Model} typeClass
    @param {Function} filter
    @param {Object} query (optional
    @return {DS.FilteredRecordArray}
  */
  createFilteredRecordArray: function(typeClass, filter, query) {
    var array = FilteredRecordArray.create({
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
  createAdapterPopulatedRecordArray: function(typeClass, query) {
    var array = AdapterPopulatedRecordArray.create({
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
  registerFilteredRecordArray: function(array, typeClass, filter) {
    var recordArrays = this.filteredRecordArrays.get(typeClass);
    recordArrays.push(array);

    this.updateFilter(array, typeClass, filter);
  },

  /**
    Unregister a RecordArray.
    So manager will not update this array.

    @method unregisterRecordArray
    @param {DS.RecordArray} array
  */
  unregisterRecordArray: function(array) {
    var typeClass = array.type;

    // unregister filtered record array
    var recordArrays = this.filteredRecordArrays.get(typeClass);
    var index = recordArrays.indexOf(array);
    if (index !== -1) {
      recordArrays.splice(index, 1);

    // unregister live record array
    } else if (this.liveRecordArrays.has(typeClass)) {
      var liveRecordArrayForType = this.liveRecordArrayFor(typeClass);
      if (array === liveRecordArrayForType) {
        this.liveRecordArrays.delete(typeClass);
      }
    }
  },

  willDestroy: function() {
    this._super(...arguments);

    this.filteredRecordArrays.forEach((value) => flatten(value).forEach(destroy));
    this.liveRecordArrays.forEach(destroy);
    this._adapterPopulatedRecordArrays.forEach(destroy);
  }
});

function destroy(entry) {
  entry.destroy();
}

function flatten(list) {
  var length = list.length;
  var result = Ember.A();

  for (var i = 0; i < length; i++) {
    result = result.concat(list[i]);
  }

  return result;
}
