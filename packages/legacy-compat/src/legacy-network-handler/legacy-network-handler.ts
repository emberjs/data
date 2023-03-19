import { assert } from '@ember/debug';

import { Promise, resolve } from 'rsvp';

import { DEBUG } from '@ember-data/env';
import { LOG_PAYLOADS } from '@ember-data/private-build-infra/debugging';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/deprecations';
import type { Handler, NextFn } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import type { Snapshot } from '@ember-data/store/-private';
import type { StoreRequestContext } from '@ember-data/store/-private/cache-handler';
import type ShimModelClass from '@ember-data/store/-private/legacy-model-support/shim-model-class';
import type { Collection } from '@ember-data/store/-private/record-arrays/identifier-array';
import type {
  CollectionResourceDocument,
  JsonApiDocument,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { AdapterPayload, MinimumAdapterInterface } from '@ember-data/types/q/minimum-adapter-interface';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';
import type { JsonApiValidationError } from '@ember-data/types/q/record-data-json-api';

import { guardDestroyedStore } from './common';
import FetchManager, { SaveOp } from './fetch-manager';
import { assertIdentifierHasId } from './identifier-has-id';
import { normalizeResponseHelper } from './serializer-response';
import SnapshotRecordArray from './snapshot-record-array';

type AdapterErrors = Error & { errors?: unknown[]; isAdapterError?: true; code?: string };
type SerializerWithParseErrors = MinimumSerializerInterface & {
  extractErrors?(store: Store, modelClass: ShimModelClass, error: AdapterErrors, recordId: string | null): unknown;
};

export const LegacyNetworkHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>) {
    // if we are not a legacy request, move on
    if (context.request.url || !context.request.op) {
      return next(context.request);
    }

    const { store } = context.request;
    if (!store._fetchManager) {
      store._fetchManager = new FetchManager(store);
    }

    switch (context.request.op) {
      case 'updateRecord':
        return saveRecord(context);
      case 'deleteRecord':
        return saveRecord(context);
      case 'createRecord':
        return saveRecord(context);
      case 'findRecord':
        return findRecord(context);
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

function saveRecord<T>(context: StoreRequestContext): Promise<T> {
  const { store, data, op: operation } = context.request;
  const { options, record: identifier } = data as { record: StableRecordIdentifier; options: Record<string, unknown> };

  const saveOptions = Object.assign(
    { [SaveOp]: operation as 'updateRecord' | 'deleteRecord' | 'createRecord' },
    options
  );
  const fetchManagerPromise = store._fetchManager.scheduleSave(identifier, saveOptions);

  return fetchManagerPromise
    .then((payload) => {
      if (LOG_PAYLOADS) {
        try {
          let data: unknown = payload ? JSON.parse(JSON.stringify(payload)) : payload;
          // eslint-disable-next-line no-console
          console.log(`EmberData | Payload - ${operation!}`, data);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(`EmberData | Payload - ${operation!}`, payload);
        }
      }
      /*
      // TODO @runspired re-evaluate the below claim now that
      // the save request pipeline is more streamlined.

      Note to future spelunkers hoping to optimize.
      We rely on this `run` to create a run loop if needed
      that `store._push` and `store.saveRecord` will both share.

      We use `join` because it is often the case that we
      have an outer run loop available still from the first
      call to `store._push`;
     */
      store._join(() => {
        let data = payload && payload.data;
        if (!data) {
          assert(
            `Your ${identifier.type} record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response.`,
            identifier.id
          );
        }

        const identifierCache = store.identifierCache;
        let actualIdentifier = identifier;
        if (operation !== 'deleteRecord' && data) {
          actualIdentifier = identifierCache.updateRecordIdentifier(identifier, data);
        }

        //We first make sure the primary data has been updated
        const cache = DEPRECATE_V1_RECORD_DATA ? store._instanceCache.getResourceCache(actualIdentifier) : store.cache;
        cache.didCommit(identifier, data);

        if (payload && payload.included) {
          store._push({ data: null, included: payload.included });
        }
      });
      return store.peekRecord(identifier);
    })
    .catch((e: unknown) => {
      let err = e;
      if (!e) {
        err = new Error(`Unknown Error Occurred During Request`);
      } else if (typeof e === 'string') {
        err = new Error(e);
      }
      adapterDidInvalidate(store, identifier, err as Error);
      throw err;
    }) as Promise<T>;
}

function adapterDidInvalidate(
  store: Store,
  identifier: StableRecordIdentifier,
  error: Error & { errors?: JsonApiValidationError[]; isAdapterError?: true; code?: string }
) {
  if (error && error.isAdapterError === true && error.code === 'InvalidError') {
    let serializer = store.serializerFor(identifier.type) as SerializerWithParseErrors;

    // TODO @deprecate extractErrors being called
    // TODO remove extractErrors from the default serializers.
    if (serializer && typeof serializer.extractErrors === 'function') {
      let errorsHash = serializer.extractErrors(store, store.modelFor(identifier.type), error, identifier.id) as Record<
        string,
        string | string[]
      >;
      error.errors = errorsHashToArray(errorsHash);
    }
  }
  const cache = DEPRECATE_V1_RECORD_DATA ? store._instanceCache.getResourceCache(identifier) : store.cache;

  if (error.errors) {
    assert(
      `Expected the cache in use by resource ${String(
        identifier
      )} to have a getErrors(identifier) method for retreiving errors.`,
      typeof cache.getErrors === 'function'
    );

    let jsonApiErrors: JsonApiValidationError[] = error.errors;
    if (jsonApiErrors.length === 0) {
      jsonApiErrors = [{ title: 'Invalid Error', detail: '', source: { pointer: '/data' } }];
    }
    cache.commitWasRejected(identifier, jsonApiErrors);
  } else {
    cache.commitWasRejected(identifier);
  }
}

function makeArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

const PRIMARY_ATTRIBUTE_KEY = 'base';
function errorsHashToArray(errors: Record<string, string | string[]>): JsonApiValidationError[] {
  const out: JsonApiValidationError[] = [];

  if (errors) {
    Object.keys(errors).forEach((key) => {
      let messages = makeArray(errors[key]);
      for (let i = 0; i < messages.length; i++) {
        let title = 'Invalid Attribute';
        let pointer = `/data/attributes/${key}`;
        if (key === PRIMARY_ATTRIBUTE_KEY) {
          title = 'Invalid Document';
          pointer = `/data`;
        }
        out.push({
          title: title,
          detail: messages[i],
          source: {
            pointer: pointer,
          },
        });
      }
    });
  }

  return out;
}

function findRecord<T>(context: StoreRequestContext): Promise<T> {
  const { store, data } = context.request;
  const { record: identifier, options } = data as {
    record: StableExistingRecordIdentifier;
    options: { reload?: boolean; backgroundReload?: boolean };
  };
  let promise: Promise<StableRecordIdentifier>;

  // if not loaded start loading
  if (!store._instanceCache.recordIsLoaded(identifier)) {
    promise = store._fetchManager.fetchDataIfNeededForIdentifier(
      identifier,
      options
    ) as Promise<StableRecordIdentifier>;

    // Refetch if the reload option is passed
  } else if (options.reload) {
    assertIdentifierHasId(identifier);

    promise = store._fetchManager.scheduleFetch(identifier, options) as Promise<StableRecordIdentifier>;
  } else {
    let snapshot: Snapshot | null = null;
    let adapter = store.adapterFor(identifier.type);

    // Refetch the record if the adapter thinks the record is stale
    if (
      typeof options.reload === 'undefined' &&
      adapter.shouldReloadRecord &&
      adapter.shouldReloadRecord(store, (snapshot = store._instanceCache.createSnapshot(identifier, options)))
    ) {
      assertIdentifierHasId(identifier);
      promise = store._fetchManager.scheduleFetch(identifier, options) as Promise<StableRecordIdentifier>;
    } else {
      // Trigger the background refetch if backgroundReload option is passed
      if (
        options.backgroundReload !== false &&
        (options.backgroundReload ||
          !adapter.shouldBackgroundReloadRecord ||
          adapter.shouldBackgroundReloadRecord(
            store,
            (snapshot = snapshot || store._instanceCache.createSnapshot(identifier, options))
          ))
      ) {
        assertIdentifierHasId(identifier);
        void store._fetchManager.scheduleFetch(identifier, options);
      }

      // Return the cached record
      promise = resolve(identifier) as Promise<StableRecordIdentifier>;
    }
  }

  return promise.then((identifier: StableRecordIdentifier) => store.peekRecord(identifier)) as Promise<T>;
}

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
    options = Object.assign({}, options);
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
