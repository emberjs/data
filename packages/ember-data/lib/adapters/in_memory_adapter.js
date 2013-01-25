require("ember-data/system/adapter");
require("ember-data/serializers/pass_through_serializer");

var get = Ember.get;

DS.InMemoryAdapter = DS.Adapter.extend({
  serializer: DS.PassThroughSerializer,

  simulateRemoteReseponse: false,

  init: function() {
    this._super();
    this.map = Ember.Map.create();
  },

  queryRecords: function(records, query) {
    return records;
  },

  storeRecord: function(type, record) {
    var records = this.recordsForType(type);

    records.set(this.extractId(type, record), record);
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

  find: function(store, type, id) {
    var records = this.recordsForType(type);

    if (records.has(id)) {
      var adapter = this;

      this.simulateRemoteCall(function() {
        adapter.didFindRecord(store, type, records.get(id), id);
      }, store, type);
    }
  },

  findQuery: function(store, type, query, array) {
    var records = this.loadedRecordsForType(type);

    var results = this.queryRecords(records, query);

    if (results) {
      var adapter = this;

      this.simulateRemoteCall(function() {
        adapter.didFindQuery(store, type, results, array); 
      }, store, type);
    }
  },

  findAll: function(store, type) {
    var records = this.loadedRecordsForType(type);

    var adapter = this;
    this.simulateRemoteCall(function() {
      adapter.didFindAll(store, type, records);
    }, store, type);
  },

  createRecord: function(store, type, record) {
    var inMemoryRecord = this.serialize(record, { includeId: true });

    this.storeRecord(type, inMemoryRecord);

    var adapter = this;

    this.simulateRemoteCall(function() {
      adapter.didCreateRecord(store, type, record, inMemoryRecord);
    }, store, type, record);
  },

  updateRecord: function(store, type, record) {
    var inMemoryRecord = this.serialize(record, { includeId: true });

    this.storeRecord(type, inMemoryRecord);

    var adapter = this;

    this.simulateRemoteCall(function() {
      adapter.didSaveRecord(store, type, record, inMemoryRecord);
    }, store, type, record);
  },

  deleteRecord: function(store, type, record) {
    this.deleteLoadedRecord(type, record);

    var adapter = this; 

    this.simulateRemoteCall(function() {
      adapter.didSaveRecord(store, type, record);
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

  deleteLoadedRecord: function(type, record) {
    var records = this.recordsForType(type);

    records.remove(this.extractId(type, record));
  },

  simulateRemoteCall: function(callback, store, type, record) {
    if (get(this, 'simulateRemoteResponse')) {
      setTimeout(callback, get(this, 'latency'));
    } else {
      callback();
    }
  }
});
