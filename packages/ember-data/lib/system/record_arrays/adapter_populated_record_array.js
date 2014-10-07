import RecordArray from "ember-data/system/record_arrays/record_array";
/**
  @module ember-data
*/

var get = Ember.get;

function cloneNull(source) {
  var clone = Object.create(null);
  for (var key in source) {
    clone[key] = source[key];
  }
  return clone;
}

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

  replace: function() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  /**
    @method load
    @private
    @param {Array} data
  */
  load: function(data) {
    var recordArray = this;
    var store = get(this, 'store');
    var type = get(this, 'type');
    var promise = store.pushMany(type, data);
    var meta = store.metadataFor(type);

    return promise.then(function(records) {
      recordArray.setProperties({
        content: Ember.A(records),
        isLoaded: true,
        meta: cloneNull(meta)
      });

      records.forEach(function(record) {
        recordArray.manager.recordArraysForRecord(record).add(recordArray);
      });

      // TODO: should triggering didLoad event be the last action of the runLoop?
      Ember.run.once(recordArray, 'trigger', 'didLoad');
    });
  }
});
