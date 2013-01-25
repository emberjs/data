require("ember-data/system/adapter");
require("ember-data/serializers/pass_through_serializer");

var get = Ember.get;

DS.InMemoryAdapter = DS.Adapter.extend({
  serializer: DS.PassThroughSerializer,

  simulateRemoteReseponse: false,

  recordsForType: function(type) {
    return type.FIXTURES;
  },

  queryRecords: function(records, query) {
    return records;
  },

  storeRecord: function(type, record) {
    var records = this.recordsForType(type);

    this.deleteLoadedRecord(type, record);

    records.push(record);
  },

  find: function(store, type, id) {
    var records = this.recordsForType(type);
    var record = this.findRecordById(records, id);

    if (record) {
      var adapter = this;
      this.simulateRemoteCall(function() {
        adapter.didFindRecord(store, type, record, id);
      }, store, type);
    }
  },

  findQuery: function(store, type, query, array) {
    var records = this.recordsForType(type);

    var results = this.queryRecords(records, query);

    if (results) {
      var adapter = this;

      this.simulateRemoteCall(function() {
        adapter.didFindQuery(store, type, results, array); 
      }, store, type);
    }
  },

  findAll: function(store, type) {
    var records = this.recordsForType(type);

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
  deleteLoadedRecord: function(type, record) {
    var id = this.extractId(type, record);

    var existingRecord = this.findExistingRecord(type, record);

    if(existingRecord) {
      var records = this.recordsForType(type, record);
      var index = records.indexOf(existingRecord);
      records.splice(index, 1);
      return true;
    }
  },

  findExistingRecord: function(type, record) {
    var records = this.recordsForType(type);
    var id = this.extractId(type, record);

    return this.findRecordById(records, id);
  },

  findRecordById: function(records, id) {
    var adapter = this;

    return records.find(function(r) {
      if(''+get(r, 'id') === ''+id) {
        return true;
      } else {
        return false;
      }
    });
  },

  simulateRemoteCall: function(callback, store, type, record) {
    if (get(this, 'simulateRemoteResponse')) {
      setTimeout(callback, get(this, 'latency'));
    } else {
      callback();
    }
  }
});
