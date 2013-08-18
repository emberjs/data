/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var once = Ember.run.once;
var forEach = Ember.EnumerableUtils.forEach;

/**
  @class RecordArrayManager
  @namespace DS
  @private
  @extends Ember.Object
*/
DS.RecordArrayManager = Ember.Object.extend({
  init: function() {
    this.filteredRecordArrays = Ember.MapWithDefault.create({
      defaultValue: function() { return []; }
    });

    this.changedRecords = [];
  },

  recordDidChange: function(record) {
    this.changedRecords.push(record);
    once(this, this.updateRecordArrays);
  },

  recordArraysForReference: function(reference) {
    reference.recordArrays = reference.recordArrays || Ember.OrderedSet.create();
    return reference.recordArrays;
  },

  /**
    This method is invoked whenever data is loaded into the store
    by the adapter or updated by the adapter, or when an attribute
    changes on a record.

    It updates all filters that a record belongs to.

    To avoid thrashing, it only runs once per run loop per record.

    @method updateRecordArrays
    @param {Class} type
    @param {Number|String} clientId
  */
  updateRecordArrays: function() {
    forEach(this.changedRecords, function(record) {
      var type = record.constructor,
          recordArrays = this.filteredRecordArrays.get(type),
          filter;

      forEach(recordArrays, function(array) {
        filter = get(array, 'filterFunction');
        this.updateRecordArray(array, filter, type, record);
      }, this);

      var reference = record._reference;

      // loop through all manyArrays containing an unloaded copy of this
      // clientId and notify them that the record was loaded.
      var manyArrays = reference.loadingRecordArrays;

      if (manyArrays) {
        for (var i=0, l=manyArrays.length; i<l; i++) {
          manyArrays[i].loadedRecord();
        }

        reference.loadingRecordArrays = [];
      }
    }, this);

    this.changedRecords = [];
  },

  /**
    Update an individual filter.

    @method updateRecordArray
    @param {DS.FilteredRecordArray} array
    @param {Function} filter
    @param {Class} type
    @param {Number|String} clientId
  */
  updateRecordArray: function(array, filter, type, record) {
    var shouldBeInArray;

    if (!filter) {
      shouldBeInArray = true;
    } else {
      shouldBeInArray = filter(record);
    }

    var recordArrays = this.recordArraysForReference(record._reference);

    if (shouldBeInArray) {
      recordArrays.add(array);
      array.addRecord(record);
    } else if (!shouldBeInArray) {
      recordArrays.remove(array);
      array.removeRecord(record);
    }
  },

  /**
    When a record is deleted, it is removed from all its
    record arrays.

    @method remove
    @param {DS.Model} record
  */
  remove: function(record) {
    var reference = record._reference,
        recordArrays = reference.recordArrays || [];

    forEach(recordArrays, function(array) {
      array.removeRecord(record);
    });
  },

  /**
    This method is invoked if the `filterFunction` property is
    changed on a `DS.FilteredRecordArray`.

    It essentially re-runs the filter from scratch. This same
    method is invoked when the filter is created in th first place.

    @method updateFilter
    @param array
    @param type
    @param filter
  */
  updateFilter: function(array, type, filter) {
    var typeMap = this.store.typeMapFor(type),
        references = typeMap.references,
        reference, data, shouldFilter, record;

    for (var i=0, l=references.length; i<l; i++) {
      reference = references[i];
      record = reference.record;

      if (!get(record, 'isDeleted') && !get(record, 'isEmpty')) {
        this.updateRecordArray(array, filter, type, record);
      }
    }
  },

  /**
    Create a `DS.ManyArray` for a type and list of record references, and index
    the `ManyArray` under each reference. This allows us to efficiently remove
    records from `ManyArray`s when they are deleted.

    @method createManyArray
    @param {Class} type
    @param {Array} references
    @return {DS.ManyArray}
  */
  createManyArray: function(type, references) {
    var manyArray = DS.ManyArray.create({
      type: type,
      content: references,
      store: this.store
    });

    forEach(references, function(reference) {
      var arrays = this.recordArraysForReference(reference);
      arrays.add(manyArray);
    }, this);

    return manyArray;
  },

  /**
    Register a RecordArray for a given type to be backed by
    a filter function. This will cause the array to update
    automatically when records of that type change attribute
    values or states.

    @method registerFilteredRecordArray
    @param {DS.RecordArray} array
    @param {Class} type
    @param {Function} filter
  */
  registerFilteredRecordArray: function(array, type, filter) {
    var recordArrays = this.filteredRecordArrays.get(type);
    recordArrays.push(array);

    this.updateFilter(array, type, filter);
  },

  // Internally, we maintain a map of all unloaded IDs requested by
  // a ManyArray. As the adapter loads data into the store, the
  // store notifies any interested ManyArrays. When the ManyArray's
  // total number of loading records drops to zero, it becomes
  // `isLoaded` and fires a `didLoad` event.
  registerWaitingRecordArray: function(record, array) {
    var reference = get(record, '_reference');

    var loadingRecordArrays = reference.loadingRecordArrays || [];
    loadingRecordArrays.push(array);
    reference.loadingRecordArrays = loadingRecordArrays;
  }
});
