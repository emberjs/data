require("ember-data/system/adapter");
require("ember-data/serializers/null_serializer");

var get = Ember.get;

DS.InMemoryAdapter = DS.Adapter.extend({
  serializer: DS.NullSerializer,

  simulateRemoteReseponse: false,

  init: function() {
    this._super();
    this.map = Ember.Map.create();
  },

  // This is here because Ember.Map does not provide
  // a way to turn itself into a generic collection
  loadedRecordsForType: function(type) {
    var records = this.recordsForType(type);

    var collection = Ember.A();

    records.forEach(function(id, object){
      collection.pushObject(object);
    });

    return collection;
  },

  createRecord: function(store, type, record) {
    var inMemoryRecord = this.serialize(record, { includeId: true });

    this.storeRecord(type, inMemoryRecord);

    this.simulateRemoteCall(function() {
      store.didSaveRecord(record, inMemoryRecord);
    }, store, type, record);
  },

  updateRecord: function(store, type, record) {
    var inMemoryRecord = this.serialize(record, { includeId: true });

    this.storeRecord(type, inMemoryRecord)

    this.simulateRemoteCall(function() {
      store.didSaveRecord(record, inMemoryRecord);
    }, store, type, record);
  },

  deleteRecord: function(store, type, record) {
    this.deleteLoadedRecord(type, record);

    this.simulateRemoteCall(function() {
      store.didSaveRecord(record);
    }, store, type, record);
  },

  // Internal helpers

  recordsForType: function(type) {
    if(this.map.has(type)) {
      return this.map.get(type);
    } else {
      this.map.set(type, Ember.Map.create());
      return this.map.get(type);
    }
  },

  storeRecord: function(type, record) {
    var records = this.recordsForType(type);

    records.set(this.extractId(type, record), record)
  },

  deleteLoadedRecord: function(type, record) {
    var records = this.recordsForType(type);

    records.remove(this.extractId(type, record));
  },
  /*
    @private
  */
  simulateRemoteCall: function(callback, store, type, record) {
    if (get(this, 'simulateRemoteResponse')) {
      setTimeout(callback, get(this, 'latency'));
    } else {
      callback();
    }
  }
});
