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

export function _find(adapter, store, typeClass, id, internalModel, options) {
  var snapshot = internalModel.createSnapshot(options);
  var promise = adapter.findRecord(store, typeClass, id, snapshot);
  var serializer = serializerForAdapter(store, adapter, internalModel.type.modelName);
  var label = "DS: Handle Adapter#findRecord of " + typeClass + " with id: " + id;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a `findRecord` request for a " + typeClass.modelName + " with id " + id + ", but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    return store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, id, 'findRecord');
      assert('Ember Data expected the primary data returned from a `findRecord` response to be an object but instead it found an array.', !Array.isArray(payload.data));

      warn(`You requested a record of type '${typeClass.modelName}' with id '${id}' but the adapter returned a payload with primary data having an id of '${payload.data.id}'. Use 'store.findRecord()' when the requested id is the same as the one returned by the adapter. In other cases use 'store.queryRecord()' instead http://emberjs.com/api/data/classes/DS.Store.html#method_queryRecord`, payload.data.id === id, {
        id: 'ds.store.findRecord.id-mismatch'
      });

      var internalModel = store._push(payload);
      return internalModel;
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
  let snapshots = Ember.A(internalModels).invoke('createSnapshot');
  let promise = adapter.findMany(store, typeClass, ids, snapshots);
  let serializer = serializerForAdapter(store, adapter, typeClass.modelName);
  let label = "DS: Handle Adapter#findMany of " + typeClass;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a `findMany` request for " + typeClass.modelName + " records with ids " + ids + ", but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    return store._adapterRun(function() {
      let payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findMany');
      let internalModels = store._push(payload);
      return internalModels;
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
    assert("You made a `findHasMany` request for a " + internalModel.modelName + "'s `" + relationship.key + "` relationship, using link " + link + ", but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
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

      var internalModel = store._push(payload);
      return internalModel;
    });
  }, null, "DS: Extract payload of " + internalModel + " : " + relationship.type);
}

export function _findAll(adapter, store, typeClass, sinceToken, options) {
  var modelName = typeClass.modelName;
  var recordArray = store.peekAll(modelName);
  var snapshotArray = recordArray._createSnapshot(options);
  var promise = adapter.findAll(store, typeClass, sinceToken, snapshotArray);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#findAll of " + typeClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    assert("You made a `findAll` request for " + typeClass.modelName + " records, but the adapter's response did not have any data", payloadIsNotBlank(adapterPayload));
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'findAll');
      store._push(payload);
    });

    store.didUpdateAll(typeClass);
    return store.peekAll(modelName);
  }, null, "DS: Extract payload of findAll " + typeClass);
}

export function _query(adapter, store, typeClass, query, recordArray) {
  let modelName = typeClass.modelName;
  let promise = adapter.query(store, typeClass, query, recordArray);

  let serializer = serializerForAdapter(store, adapter, modelName);
  let label = 'DS: Handle Adapter#query of ' + typeClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(adapterPayload => {
    let internalModels, payload;
    store._adapterRun(() => {
      payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'query');
      internalModels = store._push(payload);
    });

    assert('The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.', Array.isArray(internalModels));
    recordArray._setInternalModels(internalModels, payload);

    return recordArray;
  }, null, 'DS: Extract payload of query ' + typeClass);
}

export function _queryRecord(adapter, store, typeClass, query) {
  var modelName = typeClass.modelName;
  var promise = adapter.queryRecord(store, typeClass, query);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#queryRecord of " + typeClass;

  promise = Promise.resolve(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var internalModel;
    store._adapterRun(function() {
      var payload = normalizeResponseHelper(serializer, store, typeClass, adapterPayload, null, 'queryRecord');

      assert("Expected the primary data returned by the serializer for a `queryRecord` response to be a single object or null but instead it was an array.", !Array.isArray(payload.data), {
        id: 'ds.store.queryRecord-array-response'
      });

      internalModel = store._push(payload);
    });

    return internalModel;

  }, null, "DS: Extract payload of queryRecord " + typeClass);
}
