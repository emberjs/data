import Ember from 'ember';
import { assert } from "ember-data/-private/debug";
import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/-private/system/store/common";

import {
  normalizeResponseHelper
} from "ember-data/-private/system/store/serializer-response";

import {
  serializerForAdapter
} from "ember-data/-private/system/store/serializers";

var Promise = Ember.RSVP.Promise;

export function _find(adapter, store, typeClass, id, internalModel, options) {
  var snapshot = internalModel.createSnapshot(options);
  var promise = adapter.findRecord(store, typeClass, id, snapshot);
  var serializer = serializerForAdapter(store, adapter, internalModel.type.modelName);
  var label = "DS: Handle Adapter#findRecord of " + typeClass + " with id: " + id;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a request for a " + typeClass.typeClassKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, id, 'findRecord');
      //TODO Optimize
      var record = store.push(payload);
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

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findMany');
      //TODO Optimize, no need to materialize here
      var records = store.push(payload);
      return records.map((record) => record._internalModel);
    });
  }, null, "DS: Extract payload of " + typeClass);
}

export function _findHasMany(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var typeClass = store.modelFor(relationship.type);
  var promise = adapter.findHasMany(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findHasMany of " + internalModel + " : " + relationship.type;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findHasMany');
      //TODO Use a non record creating push
      var records = store.push(payload);
      var recordArray = records.map((record) => record._internalModel);
      recordArray.meta = payload.meta;
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

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findBelongsTo');

      if (!payload.data) {
        return null;
      }

      //TODO Optimize
      var record = store.push(payload);
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

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findAll');
      //TODO Optimize
      store.push(payload);
    });

    store.didUpdateAll(typeClass);
    return store.peekAll(modelName);
  }, null, "DS: Extract payload of findAll " + typeClass);
}

export function _query(adapter, store, typeClass, query, recordArray) {
  var modelName = typeClass.modelName;
  var promise = adapter.query(store, typeClass, query, recordArray);

  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#query of " + typeClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var records;
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'query');
      //TODO Optimize
      records = store.push(payload);
    });

    assert('The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.', Ember.isArray(records));
    recordArray.loadRecords(records);
    return recordArray;

  }, null, "DS: Extract payload of query " + typeClass);
}

export function _queryRecord(adapter, store, typeClass, query) {
  var modelName = typeClass.modelName;
  var promise = adapter.queryRecord(store, typeClass, query);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#queryRecord of " + typeClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var record;
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'queryRecord');
      //TODO Optimize
      record = store.push(payload);
    });

    return record;

  }, null, "DS: Extract payload of queryRecord " + typeClass);
}
