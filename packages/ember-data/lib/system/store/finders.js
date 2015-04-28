import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/system/store/common";

import {
  serializerForAdapter
} from "ember-data/system/store/serializers";

import {
  typeForRelationshipMeta
} from "ember-data/system/relationship-meta";


var get = Ember.get;
var Promise = Ember.RSVP.Promise;

export function _find(adapter, store, type, id, record) {
  var snapshot = record._createSnapshot();
  var promise = adapter.find(store, type, id, snapshot);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#find of " + type + " with id: " + id;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var modelClass = store.modelFor(type);
    Ember.assert("You made a request for a " + type.typeKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
    return store._adapterRun(function() {
      var payload = serializer.extract(store, modelClass, adapterPayload, id, 'find');

      return store.push(type, payload);
    });
  }, function(error) {
    var record = store.getById(type, id);
    if (record) {
      record.notFound();
      if (get(record, 'isEmpty')) {
        store.unloadRecord(record);
      }
    }
    throw error;
  }, "DS: Extract payload of '" + type + "'");
}


export function _findMany(adapter, store, type, ids, records) {
  var snapshots = Ember.A(records).invoke('_createSnapshot');
  var promise = adapter.findMany(store, type, ids, snapshots);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#findMany of " + type;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var modelClass = store.modelFor(type);
      var payload = serializer.extract(store, modelClass, adapterPayload, null, 'findMany');

      Ember.assert("The response from a findMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      return store.pushMany(type, payload);
    });
  }, null, "DS: Extract payload of " + type);
}

export function _findHasMany(adapter, store, record, link, relationshipMeta) {
  var snapshot = record._createSnapshot();
  var promise = adapter.findHasMany(store, snapshot, link, relationshipMeta);
  var typeKey = typeForRelationshipMeta(relationshipMeta);
  var serializer = serializerForAdapter(store, adapter, typeKey);
  var label = "DS: Handle Adapter#findHasMany of " + record + " : " + typeKey;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var hasManyClass = store.modelFor(typeKey);
      var payload = serializer.extract(store, hasManyClass, adapterPayload, null, 'findHasMany');

      Ember.assert("The response from a findHasMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      var records = store.pushMany(typeKey, payload);
      return records;
    });
  }, null, "DS: Extract payload of " + record + " : hasMany " + typeKey);
}

export function _findBelongsTo(adapter, store, record, link, relationshipMeta) {
  var snapshot = record._createSnapshot();
  var promise = adapter.findBelongsTo(store, snapshot, link, relationshipMeta);
  var belongsToType = typeForRelationshipMeta(relationshipMeta);
  var serializer = serializerForAdapter(store, adapter, belongsToType);
  var label = "DS: Handle Adapter#findBelongsTo of " + record + " : " + belongsToType;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var belongsToClass = store.modelFor(belongsToType);
      var payload = serializer.extract(store, belongsToClass, adapterPayload, null, 'findBelongsTo');

      if (!payload) {
        return null;
      }

      var record = store.push(belongsToType, payload);
      return record;
    });
  }, null, "DS: Extract payload of " + record + " : " + belongsToType);
}

export function _findAll(adapter, store, type, sinceToken) {
  var promise = adapter.findAll(store, type, sinceToken);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#findAll of " + type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    store._adapterRun(function() {
      var payload = serializer.extract(store, type, adapterPayload, null, 'findAll');

      Ember.assert("The response from a findAll must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      store.pushMany(type, payload);
    });

    store.didUpdateAll(type);
    return store.all(type);
  }, null, "DS: Extract payload of findAll " + type);
}

export function _findQuery(adapter, store, type, query, recordArray) {
  var promise = adapter.findQuery(store, type, query, recordArray);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#findQuery of " + type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var payload;
    store._adapterRun(function() {
      var modelClass = store.modelFor(type);
      payload = serializer.extract(store, modelClass, adapterPayload, null, 'findQuery');

      Ember.assert("The response from a findQuery must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');
    });

    recordArray.load(payload);
    return recordArray;

  }, null, "DS: Extract payload of findQuery " + type);
}
