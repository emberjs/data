import { assert } from '@ember/debug';

import { Promise } from 'rsvp';

import { guardDestroyedStore } from '../utils/common';
import { normalizeResponseHelper } from '../utils/serializer-response';
import SnapshotRecordArray from './snapshot-record-array';

/**
  @module @ember-data/store
*/

function payloadIsNotBlank(adapterPayload) {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length;
  }
}

export function _findAll(adapter, store, modelName, options, snapshotArray) {
  let modelClass = store.modelFor(modelName); // adapter.findAll depends on the class
  let recordArray = store.peekAll(modelName);
  snapshotArray = snapshotArray || new SnapshotRecordArray(store, recordArray, options);
  let promise = Promise.resolve().then(() => adapter.findAll(store, modelClass, null, snapshotArray));
  let label = 'DS: Handle Adapter#findAll of ' + modelClass;

  promise = guardDestroyedStore(promise, store, label);

  return promise.then(
    (adapterPayload) => {
      assert(
        `You made a 'findAll' request for '${modelName}' records, but the adapter's response did not have any data`,
        payloadIsNotBlank(adapterPayload)
      );
      let serializer = store.serializerFor(modelName);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findAll');

      store._push(payload);
      recordArray.isUpdating = false;
      return recordArray;
    },
    null,
    'DS: Extract payload of findAll ${modelName}'
  );
}

export function _query(adapter, store, modelName, query, recordArray, options) {
  let modelClass = store.modelFor(modelName); // adapter.query needs the class

  // TODO @deprecate RecordArrays being passed to Adapters
  recordArray =
    recordArray ||
    store.recordArrayManager.createArray({
      type: modelName,
      query,
    });
  let promise = Promise.resolve().then(() => adapter.query(store, modelClass, query, recordArray, options));

  let label = `DS: Handle Adapter#query of ${modelName}`;
  promise = guardDestroyedStore(promise, store, label);

  return promise.then(
    (adapterPayload) => {
      let serializer = store.serializerFor(modelName);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'query');
      let identifiers = store._push(payload);

      assert(
        'The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.',
        Array.isArray(identifiers)
      );
      store.recordArrayManager.populateManagedArray(recordArray, identifiers, payload);

      return recordArray;
    },
    null,
    `DS: Extract payload of query ${modelName}`
  );
}

export function _queryRecord(adapter, store, modelName, query, options) {
  let modelClass = store.modelFor(modelName); // adapter.queryRecord needs the class
  let promise = Promise.resolve().then(() => adapter.queryRecord(store, modelClass, query, options));

  let label = `DS: Handle Adapter#queryRecord of ${modelName}`;
  promise = guardDestroyedStore(promise, store, label);

  return promise.then(
    (adapterPayload) => {
      let serializer = store.serializerFor(modelName);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'queryRecord');

      assert(
        `Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array.`,
        !Array.isArray(payload.data)
      );

      return store._push(payload);
    },
    null,
    `DS: Extract payload of queryRecord ${modelName}`
  );
}
