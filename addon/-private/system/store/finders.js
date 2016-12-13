import Ember from 'ember';
import { assert, warn } from "ember-data/-private/debug";
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

function payloadIsNotBlank(adapterPayload) {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length;
  }
}

export function _find(adapter, store, modelClass, id, internalModel, options) {
  var snapshot = internalModel.createSnapshot(options);
  var promise = adapter.findRecord(store, modelClass, id, snapshot);
  var serializer = serializerForAdapter(store, adapter, internalModel.type.modelName);
  var label = "DS: Handle Adapter#findRecord of " + modelClass + " with id: " + id;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a `findRecord` request for a " + modelClass.modelName + " with id " + id + ", but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, id, 'findRecord');
    assert('Ember Data expected the primary data returned from a `findRecord` response to be an object but instead it found an array.', !Array.isArray(payload.data));

    warn(`You requested a record of type '${modelClass.modelName}' with id '${id}' but the adapter returned a payload with primary data having an id of '${payload.data.id}'. Use 'store.findRecord()' when the requested id is the same as the one returned by the adapter. In other cases use 'store.queryRecord()' instead http://emberjs.com/api/data/classes/DS.Store.html#method_queryRecord`, payload.data.id === id, {
      id: 'ds.store.findRecord.id-mismatch'
    });

    return store._push(payload);
  }, function(error) {
    internalModel.notFound();
    if (internalModel.isEmpty()) {
      internalModel.unloadRecord();
    }

    throw error;
  }, "DS: Extract payload of '" + modelClass + "'");
}


export function _findMany(adapter, store, modelClass, ids, internalModels) {
  let snapshots = Ember.A(internalModels).invoke('createSnapshot');
  let promise = adapter.findMany(store, modelClass, ids, snapshots);
  let serializer = serializerForAdapter(store, adapter, modelClass.modelName);
  let label = "DS: Handle Adapter#findMany of " + modelClass;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a `findMany` request for " + modelClass.modelName + " records with ids " + ids + ", but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findMany');
    return store._push(payload);
  }, null, "DS: Extract payload of " + modelClass);
}

export function _findHasMany(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var modelClass = store.modelFor(relationship.type);
  var promise = adapter.findHasMany(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findHasMany of " + internalModel + " : " + relationship.type;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    assert("You made a `findHasMany` request for a " + internalModel.modelName + "'s `" + relationship.key + "` relationship, using link " + link + ", but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findHasMany');
    let internalModelArray = store._push(payload);

    internalModelArray.meta = payload.meta;
    return internalModelArray;
  }, null, "DS: Extract payload of " + internalModel + " : hasMany " + relationship.type);
}

export function _findBelongsTo(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var modelClass = store.modelFor(relationship.type);
  var promise = adapter.findBelongsTo(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findBelongsTo of " + internalModel + " : " + relationship.type;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findBelongsTo');

    if (!payload.data) {
      return null;
    }

    return store._push(payload);
  }, null, "DS: Extract payload of " + internalModel + " : " + relationship.type);
}

export function _findAll(adapter, store, modelClass, sinceToken, options) {
  var modelName = modelClass.modelName;
  var recordArray = store.peekAll(modelName);
  var snapshotArray = recordArray._createSnapshot(options);
  var promise = adapter.findAll(store, modelClass, sinceToken, snapshotArray);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#findAll of " + modelClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a `findAll` request for " + modelClass.modelName + " records, but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findAll');

    store._push(payload);
    store.didUpdateAll(modelName);

    return store.peekAll(modelName);
  }, null, "DS: Extract payload of findAll " + modelClass);
}

export function _query(adapter, store, modelClass, query, recordArray) {
  let modelName = modelClass.modelName;
  let promise = adapter.query(store, modelClass, query, recordArray);

  let serializerToken = heimdall.start('initial-serializerFor-lookup');
  let serializer = serializerForAdapter(store, adapter, modelName);
  heimdall.stop(serializerToken);
  let label = 'DS: Handle Adapter#query of ' + modelClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
    let normalizeToken = heimdall.start('finders#_query::normalizeResponseHelper');
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'query');
    heimdall.stop(normalizeToken);
    let internalModels = store._push(payload);

    assert('The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.', Array.isArray(internalModels));
    recordArray._setInternalModels(internalModels, payload);

    return recordArray;
  }, null, 'DS: Extract payload of query ' + modelName);
}

export function _queryRecord(adapter, store, modelClass, query) {
  let modelName = modelClass.modelName;
  let promise = adapter.queryRecord(store, modelClass, query);
  let serializer = serializerForAdapter(store, adapter, modelName);
  let label = `DS: Handle Adapter#queryRecord of ${modelName}`;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'queryRecord');

    assert("Expected the primary data returned by the serializer for a `queryRecord` response to be a single object or null but instead it was an array.", !Array.isArray(payload.data), {
      id: 'ds.store.queryRecord-array-response'
    });

    return store._push(payload);
  }, null, "DS: Extract payload of queryRecord " + modelName);
}
