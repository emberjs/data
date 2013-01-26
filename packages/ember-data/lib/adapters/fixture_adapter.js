require("ember-data/system/adapter");
require("ember-data/serializers/rest_serializer");

var get = Ember.get;

/**
  `DS.FixtureAdapter` is an adapter that loads records from memory.
  Its primarily used for development and testing. You can also use
  `DS.FixtureAdapter` while working on the API but are not ready to
  integrate yet. It is a fully functioning adapter. All CRUD methods
  are implemented. You can also implement query logic that a remote
  system would do. Its possible to do develop your entire application
  with `DS.FixtureAdapter`.

  ## Preloading Data

  `DS.FixtureAdapter` has a `storeRecord` method. This method is used
  to make data available, but not load it. This is equivalent to creating
  the data in a remote system. `storeRecord` calls `recordsForType`.
  `recordsForType` must an array for data objects. `recordsForType` looks
  in the `FIXTURES` array by default. You can override this if you like.
  Assume you have a basic person model. You can load the data in two ways:

  ```javascript
  adapter = DS.FixtureAdapter.create()

  adapter.storeRecord(App.Person, { 
    id: "1"
    name: "Adam Hawkins"
    handle: "twinturbo"
  });

  // You can also set .FIXTURES if you like

  App.Person.FIXTURES = [{
    id: "1"
    name: "Adam Hawkins"
    handle: "twinturbo"
  }];
  ```

  ## Data Format

  The data format is dictated by the serializer. `DS.JSONSerializer` is used
  by default. This means the objects passed to `storeRecord` or placed into
  `FIXTURES` must be something that `DS.JSONSerializer` expects. 
  `DS.JSONSerializer` allows you to sideload and embedded associations.
  `DS.FixtureAdapter` does not set these up for you. You must determine the
  correct data format based on the serializer. The data must be serializable
  and deserializable. When records are commited their serialized format is
  updated in memory. Finding them again will deserialize and load the record
  again.

  ## Advanced Usage

  `DS.FixtureAdapter` was primarily used for storing simulated JSON responses.
  It was a place holder for an existing REST API. You can turn this on its
  head if you like. `DS.JSONSerializer` has its own semantics. These are useful
  when handling JSON. However you may not be handling JSON. Picture this use case.
  You are just starting a new app. You don't know how the API would work. You don't
  know anything about how the data is persisted. Actually, you don't care about the
  the backend at all. It's not important for you. You just need something to 
  store data when `commit` is called. You can use `DS.FixtureAdapter` with
  `DS.PassThroughSerializer` for this case. `DS.FixtureAdapter` is a simple in memory
  store. You can remove data semantics by using `DS.PassThroughSerializer`. 
  `DS.PassThroughSerializer` has no semantics. Whatever is given to it is
  simply returned. This creates one big difference: You store application objects
  and not serialized representations of them. Here's an example.

  ```javascript
  var adapter = DS.FixtureAdapter.create({
    serializer: DS.PassThroughSerializer
  });

  var Person = DS.Model.extend({
    profile: DS.attr('object');
  });

  var adam = Person.createRecord();

  adam.set('profile', Ember.Object.create({
    music: ['trance', 'baleric'],
    skills: ['ruby', 'javascript']
  }));

  adam.commit();

  var records = store.recordForType(Person);

  var adamInMemory = records[0];
  // adamInMemory is the same object that was
  // commited. the `profile` is an Ember.Object
  // and not a basic object.
  ```
*/

DS.FixtureAdapter = DS.Adapter.extend({
  simulateRemoteResponse: true,

  latency: 100,

  recordsForType: function(type) {
    if(Ember.isNone(type.FIXTURES)) type.FIXTURES = [];

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
