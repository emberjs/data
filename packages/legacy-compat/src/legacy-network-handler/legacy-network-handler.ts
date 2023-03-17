import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { Promise } from 'rsvp';

import type { Handler, NextFn } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import type { StoreRequestContext } from '@ember-data/store/-private/cache-handler';
import type { Collection } from '@ember-data/store/-private/record-arrays/identifier-array';
import type {
  CollectionResourceDocument,
  JsonApiDocument,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { AdapterPayload, MinimumAdapterInterface } from '@ember-data/types/q/minimum-adapter-interface';

import { guardDestroyedStore } from './common';
import { normalizeResponseHelper } from './serializer-response';
import SnapshotRecordArray from './snapshot-record-array';

export const LegacyNetworkHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>) {
    // if we are not a legacy request, move on
    if (context.request.url || !context.request.op) {
      return next(context.request);
    }

    switch (context.request.op) {
      case 'findAll':
        return findAll(context);
      case 'queryRecord':
        return queryRecord(context);
      case 'query':
        return query(context);
      default:
        return next(context.request);
    }
  },
};

function findAll<T>(context: StoreRequestContext): Promise<T> {
  const { store, data } = context.request;
  const { type, options } = data as {
    type: string;
    options: { reload?: boolean; backgroundReload?: boolean };
  };
  const adapter = store.adapterFor(type);

  assert(`You tried to load all records but you have no adapter (for ${type})`, adapter);
  assert(
    `You tried to load all records but your adapter does not implement 'findAll'`,
    typeof adapter.findAll === 'function'
  );

  // avoid initializing the liveArray just to set `isUpdating`
  const maybeRecordArray = store.recordArrayManager._live.get(type);
  const snapshotArray = new SnapshotRecordArray(store, type, options);

  const shouldReload =
    options.reload ||
    (options.reload !== false &&
      ((adapter.shouldReloadAll && adapter.shouldReloadAll(store, snapshotArray)) ||
        (!adapter.shouldReloadAll && snapshotArray.length === 0)));

  let fetch: Promise<T> | undefined;
  if (shouldReload) {
    maybeRecordArray && (maybeRecordArray.isUpdating = true);
    fetch = _findAll(adapter, store, type, snapshotArray);
  } else {
    fetch = Promise.resolve(store.peekAll(type)) as Promise<T>;

    if (
      options.backgroundReload ||
      (options.backgroundReload !== false &&
        (!adapter.shouldBackgroundReloadAll || adapter.shouldBackgroundReloadAll(store, snapshotArray)))
    ) {
      maybeRecordArray && (maybeRecordArray.isUpdating = true);
      void _findAll(adapter, store, type, snapshotArray);
    }
  }

  return fetch;
}

function payloadIsNotBlank(adapterPayload: unknown) {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length;
  }
}

function _findAll<T>(
  adapter: MinimumAdapterInterface,
  store: Store,
  type: string,
  snapshotArray: SnapshotRecordArray
): Promise<T> {
  const schema = store.modelFor(type);
  let promise = Promise.resolve().then(() => adapter.findAll(store, schema, null, snapshotArray));
  promise = guardDestroyedStore(
    promise,
    store,
    DEBUG ? `DS: Handle Adapter#findAll of ${type}` : ''
  ) as Promise<AdapterPayload>;

  return promise.then((adapterPayload) => {
    assert(
      `You made a 'findAll' request for '${type}' records, but the adapter's response did not have any data`,
      payloadIsNotBlank(adapterPayload)
    );
    const serializer = store.serializerFor(type);
    const payload = normalizeResponseHelper(serializer, store, schema, adapterPayload, null, 'findAll');

    store._push(payload);
    snapshotArray._recordArray.isUpdating = false;
    return snapshotArray._recordArray;
  }) as Promise<T>;
}

function query<T>(context: StoreRequestContext): Promise<T> {
  const { store, data } = context.request;
  let { options } = data as {
    options: { _recordArray?: Collection; adapterOptions?: Record<string, unknown> };
  };
  const { type, query } = data as {
    type: string;
    query: Record<string, unknown>;
    options: { _recordArray?: Collection; adapterOptions?: Record<string, unknown> };
  };
  const adapter = store.adapterFor(type);

  assert(`You tried to make a query but you have no adapter (for ${type})`, adapter);
  assert(`You tried to make a query but your adapter does not implement 'query'`, typeof adapter.query === 'function');

  const recordArray =
    options._recordArray ||
    store.recordArrayManager.createArray({
      type,
      query,
    });

  if (DEBUG) {
    options = { ...options };
    delete options._recordArray;
  } else {
    delete options._recordArray;
  }
  const schema = store.modelFor(type);
  let promise = Promise.resolve().then(() => adapter.query(store, schema, query, recordArray, options));

  promise = guardDestroyedStore(
    promise,
    store,
    DEBUG ? `DS: Handle Adapter#query of ${type}` : ``
  ) as Promise<AdapterPayload>;

  return promise.then((adapterPayload) => {
    const serializer = store.serializerFor(type);
    const payload = normalizeResponseHelper(
      serializer,
      store,
      schema,
      adapterPayload as Record<string, unknown>,
      null,
      'query'
    );
    const identifiers = store._push(payload);

    assert(
      'The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.',
      Array.isArray(identifiers)
    );

    store.recordArrayManager.populateManagedArray(recordArray, identifiers, payload as CollectionResourceDocument);

    return recordArray;
  }) as Promise<T>;
}

function assertSingleResourceDocument(payload: JsonApiDocument): asserts payload is SingleResourceDocument {
  assert(
    `Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array.`,
    !Array.isArray(payload.data)
  );
}

function queryRecord<T>(context: StoreRequestContext): Promise<T> {
  const { store, data } = context.request;
  const { type, query, options } = data as { type: string; query: Record<string, unknown>; options: object };
  const adapter = store.adapterFor(type);

  assert(`You tried to make a query but you have no adapter (for ${type})`, adapter);
  assert(
    `You tried to make a query but your adapter does not implement 'queryRecord'`,
    typeof adapter.queryRecord === 'function'
  );

  const schema = store.modelFor(type);
  let promise = Promise.resolve().then(() => adapter.queryRecord(store, schema, query, options)) as Promise<T>;

  promise = guardDestroyedStore(promise, store, DEBUG ? `DS: Handle Adapter#queryRecord of ${type}` : ``) as Promise<T>;

  return promise.then((adapterPayload: T) => {
    const serializer = store.serializerFor(type);
    const payload = normalizeResponseHelper(
      serializer,
      store,
      schema,
      adapterPayload as Record<string, unknown>,
      null,
      'queryRecord'
    );

    assertSingleResourceDocument(payload);

    return store.push(payload);
  }) as Promise<T>;
}
