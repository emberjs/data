import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/system/store/common";

import {
  serializerForAdapter
} from "ember-data/system/store/serializers";


var Promise = Ember.RSVP.Promise;
var map = Ember.EnumerableUtils.map;

export function _find(adapter, store, typeClass, id, internalModel) {
  var snapshot = internalModel.createSnapshot();
  var promise = adapter.find(store, typeClass, id, snapshot);
  var serializer = serializerForAdapter(store, adapter, internalModel.type.modelName);
  var label = "DS: Handle Adapter#find of " + typeClass + " with id: " + id;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    Ember.assert("You made a request for a " + typeClass.typeClassKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
    return store._adapterRun(function() {
      var payload = serializer.extract(store, typeClass, adapterPayload, id, 'find');

      //TODO Optimize
      var record = store.push(typeClass.modelName, payload);
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
      var payload = serializer.extract(store, typeClass, adapterPayload, null, 'findMany');

      Ember.assert("The response from a findMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      //TODO Optimize, no need to materialize here
      var records = store.pushMany(typeClass.modelName, payload);
      return map(records, function(record) { return record._internalModel; });
    });
  }, null, "DS: Extract payload of " + typeClass);
}

export function _findHasMany(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var typeClass = store.modelFor(relationship);
  var promise = adapter.findHasMany(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship);
  var label = "DS: Handle Adapter#findHasMany of " + internalModel + " : " + relationship;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = serializer.extract(store, typeClass, adapterPayload, null, 'findHasMany');

      Ember.assert("The response from a findHasMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      //TODO Use a non record creating push
      var records = store.pushMany(relationship, payload);
      return map(records, function(record) { return record._internalModel; });
    });
  }, null, "DS: Extract payload of " + internalModel + " : hasMany " + relationship);
}

export function _findBelongsTo(adapter, store, internalModel, link, relationship) {
  var snapshot = internalModel.createSnapshot();
  var typeClass = store.modelFor(relationship);
  var promise = adapter.findBelongsTo(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship);
  var label = "DS: Handle Adapter#findBelongsTo of " + internalModel + " : " + relationship;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = serializer.extract(store, typeClass, adapterPayload, null, 'findBelongsTo');

      if (!payload) {
        return null;
      }

      var record = store.push(relationship, payload);
      //TODO Optimize
      return record._internalModel;
    });
  }, null, "DS: Extract payload of " + internalModel + " : " + relationship);
}

export function _findAll(adapter, store, typeClass, sinceToken) {
  var promise = adapter.findAll(store, typeClass, sinceToken);
  var modelName = typeClass.modelName;
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#findAll of " + typeClass;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    store._adapterRun(function() {
      var payload = serializer.extract(store, typeClass, adapterPayload, null, 'findAll');

      Ember.assert("The response from a findAll must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      store.pushMany(modelName, payload);
    });

    store.didUpdateAll(typeClass);
    return store.all(modelName);
  }, null, "DS: Extract payload of findAll " + typeClass);
}

export function _findQuery(adapter, store, typeClass, query, recordArray) {
  var modelName = typeClass.modelName;
  var promise = adapter.findQuery(store, typeClass, query, recordArray);
  var serializer = serializerForAdapter(store, adapter, modelName);
  var label = "DS: Handle Adapter#findQuery of " + typeClass;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var payload;
    store._adapterRun(function() {
      payload = serializer.extract(store, typeClass, adapterPayload, null, 'findQuery');

      Ember.assert("The response from a findQuery must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');
    });

    recordArray.load(payload);
    return recordArray;

  }, null, "DS: Extract payload of findQuery " + typeClass);
}
