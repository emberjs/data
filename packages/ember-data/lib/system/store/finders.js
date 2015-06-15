import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/system/store/common";

import {
  normalizeResponseHelper,
  pushPayload
} from "ember-data/system/store/serializer-response";

import {
  serializerForAdapter
} from "ember-data/system/store/serializers";

var Promise = Ember.RSVP.Promise;
var map = Ember.ArrayPolyfills.map;
var get = Ember.get;

export function _find(adapter, store, typeClass, id, internalModel, options) {
  var snapshot = internalModel.createSnapshot(options);
  var promise;
  if (!adapter.findRecord) {
    Ember.deprecate('Adapter#find has been deprecated and renamed to `findRecord`.');
    promise = adapter.find(store, typeClass, id, snapshot);
  } else {
    promise = adapter.findRecord(store, typeClass, id, snapshot);
  }
  var serializer = serializerForAdapter(store, adapter, internalModel.type.modelName);
  var label = "DS: Handle Adapter#find of " + typeClass + " with id: " + id;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    Ember.assert("You made a request for a " + typeClass.typeClassKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
    return store._adapterRun(function() {
      var requestType = get(serializer, 'isNewSerializerAPI') ? 'findRecord' : 'find';
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, id, requestType);
      //TODO Optimize
      var record = pushPayload(store, payload);
      return record._internalModel;
    });
  }, function(error) {
    internalModel.notFound();
    if (internalModel.isEmpty()) {
      internalModel.unloadRecord();
    }

    throw error;
  }, "DS: Extract payload of '" + typeClass + "'");
}


export function _findMany(adapter, store, typeClass, ids, internalModels) {
  var snapshots = Ember.A(internalModels).invoke('createSnapshot');
  var promise = adapter.findMany(store, typeClass, ids, snapshots);
  var serializer = serializerForAdapter(store, adapter, typeClass.modelName);
  var label = "DS: Handle Adapter#findMany of " + typeClass;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findMany');
      //TODO Optimize, no need to materialize here
      var records = pushPayload(store, payload);
      return map.call(records, function(record) { return record._internalModel; });
    });
  }, null, "DS: Extract payload of " + typeClass);
}

export function _findHasMany(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var typeClass = store.modelFor(relationship.type);
  var promise = adapter.findHasMany(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findHasMany of " + internalModel + " : " + relationship.type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findHasMany');
      //TODO Use a non record creating push
      var records = pushPayload(store, payload);
      var recordArray = map.call(records, function(record) { return record._internalModel; });
      if (serializer.get('isNewSerializerAPI')) {
        recordArray.meta = payload.meta;
      }
      return recordArray;
    });
  }, null, "DS: Extract payload of " + internalModel + " : hasMany " + relationship.type);
}

export function _findBelongsTo(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var typeClass = store.modelFor(relationship.type);
  var promise = adapter.findBelongsTo(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findBelongsTo of " + internalModel + " : " + relationship.type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findBelongsTo');

      if (!payload.data) {
        return null;
      }

      //TODO Optimize
      var record = pushPayload(store, payload);
      return record._internalModel;
    });
  }, null, "DS: Extract payload of " + internalModel + " : " + relationship.type);
}

export function _findAll(adapter, store, typeClass, sinceToken, options) {
  var modelName = typeClass.modelName;
  var recordArray = store.peekAll(modelName);
  var snapshotArray = recordArray.createSnapshot(options);
  var promise = adapter.findAll(store, typeClass, sinceToken, snapshotArray);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#findAll of " + typeClass;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findAll');
      //TODO Optimize
      pushPayload(store, payload);
    });

    store.didUpdateAll(typeClass);
    return store.peekAll(modelName);
  }, null, "DS: Extract payload of findAll " + typeClass);
}

export function _query(adapter, store, typeClass, query, recordArray) {
  var modelName = typeClass.modelName;
  var promise;

  if (!adapter.query) {
    Ember.deprecate('Adapter#findQuery has been deprecated and renamed to `query`.');
    promise = adapter.findQuery(store, typeClass, query, recordArray);
  } else {
    promise = adapter.query(store, typeClass, query, recordArray);
  }

  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#findQuery of " + typeClass;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var records;
    store._adapterRun(function() {
      var requestType = get(serializer, 'isNewSerializerAPI') ? 'query' : 'findQuery';
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, requestType);
      //TODO Optimize
      records = pushPayload(store, payload);
    });

    recordArray.loadRecords(records);
    return recordArray;

  }, null, "DS: Extract payload of findQuery " + typeClass);
}

export function _queryRecord(adapter, store, typeClass, query) {
  var modelName = typeClass.modelName;
  var promise = adapter.queryRecord(store, typeClass, query);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#queryRecord of " + typeClass;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var record;
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'queryRecord');
      //TODO Optimize
      record = pushPayload(store, payload);
    });

    return record;

  }, null, "DS: Extract payload of queryRecord " + typeClass);
}
