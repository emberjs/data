import RecordArray from "ember-data/system/record-arrays/record-array";
/**
  @module ember-data
*/

var get = Ember.get;

function cloneNull(source) {
  var clone = Ember.create(null);
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

  replace() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  /**
    @method load
    @private
    @param {Array} data
  */
  load(data) {
    var store = get(this, 'store');
    var type = get(this, 'type');
    var records = store.pushMany(type, data);
    var meta = store.metadataFor(type);

    //TODO Optimize
    var internalModels = Ember.A(records).mapBy('_internalModel');
    this.setProperties({
      content: Ember.A(internalModels),
      isLoaded: true,
      meta: cloneNull(meta)
    });

    internalModels.forEach(function(record) {
      this.manager.recordArraysForRecord(record).add(this);
    }, this);

    // TODO: should triggering didLoad event be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
  }
});
