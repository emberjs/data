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

  recordsForType: function(type) {
    if(this.map.has(type)) {
      return this.map.get(type);
    } else {
      this.map.set(type, Ember.A());
      return this.map.get(type);
    }
  },

  storeRecord: function(type, record) {
    var records = this.recordsForType(type, record);

    records.pushObject(record);
  },

  createRecord: function(store, type, record) {
    var inMemoryRecord = this.serialize(record, { includeId: true });

    // inMemoryRecord.id = this.generateIdForRecord(store, record);

    this.storeRecord(type, inMemoryRecord);

    this.simulateRemoteCall(function() {
      store.didSaveRecord(record, inMemoryRecord);
    }, store, type, record);
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
