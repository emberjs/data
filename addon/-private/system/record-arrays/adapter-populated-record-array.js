import Ember from 'ember';
import RecordArray from "ember-data/-private/system/record-arrays/record-array";
import cloneNull from "ember-data/-private/system/clone-null";

/**
  @module ember-data
*/

var get = Ember.get;

/**
  Represents an ordered list of records whose order and membership is
  determined by the adapter. For example, a query sent to the adapter
  may trigger a search on the server, whose results would be loaded
  into an instance of the `AdapterPopulatedRecordArray`.

  @class AdapterPopulatedRecordArray
  @namespace DS
  @extends DS.RecordArray
*/
export default RecordArray.extend({
  query: null,

  replace() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  /**
    @method loadRecords
    @param {Array} records
    @param {Object} payload normalized payload
    @private
  */
  loadRecords(records, payload) {
    //TODO Optimize
    var internalModels = Ember.A(records).mapBy('_internalModel');
    this.setProperties({
      content: Ember.A(internalModels),
      isLoaded: true,
      meta: cloneNull(payload.meta)
    });

    internalModels.forEach((record) => {
      this.manager.recordArraysForRecord(record).add(this);
    });

    // TODO: should triggering didLoad event be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
  }
});
