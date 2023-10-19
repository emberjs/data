import { assert } from '@ember/debug';

import { importSync } from '@embroider/macros';

import { LOG_PAYLOADS } from '@ember-data/debugging';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/deprecations';
import { DEBUG, TESTING } from '@ember-data/env';
import type { Handler, NextFn } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import type { StoreRequestContext, StoreRequestInfo } from '@ember-data/store/-private/cache-handler';
import type { Collection } from '@ember-data/store/-private/record-arrays/identifier-array';
import { SingleResourceDataDocument } from '@ember-data/types/cache/document';
import type { ModelSchema } from '@ember-data/types/q/ds-model';
import type {
  CollectionResourceDocument,
  JsonApiDocument,
  Links,
  PaginationLinks,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableExistingRecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { AdapterPayload, MinimumAdapterInterface } from '@ember-data/types/q/minimum-adapter-interface';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';
import type { JsonApiError } from '@ember-data/types/q/record-data-json-api';
import type { RelationshipSchema } from '@ember-data/types/q/record-data-schemas';

import { guardDestroyedStore } from './common';
import FetchManager, { SaveOp } from './fetch-manager';
import { assertIdentifierHasId } from './identifier-has-id';
import { _findBelongsTo, _findHasMany } from './legacy-data-fetch';
import { payloadIsNotBlank } from './legacy-data-utils';
import { normalizeResponseHelper } from './serializer-response';
import type Snapshot from './snapshot';
import SnapshotRecordArray from './snapshot-record-array';

type AdapterErrors = Error & { errors?: unknown[]; isAdapterError?: true; code?: string };
type SerializerWithParseErrors = MinimumSerializerInterface & {
  extractErrors?(store: Store, modelClass: ModelSchema, error: AdapterErrors, recordId: string | null): unknown;
};

const PotentialLegacyOperations = new Set([
  'findRecord',
  'findAll',
  'query',
  'queryRecord',
  'findBelongsTo',
  'findHasMany',
  'updateRecord',
  'createRecord',
  'deleteRecord',
]);

export const LegacyNetworkHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T> {
    // if we are not a legacy request, move on
    if (context.request.url || !context.request.op || !PotentialLegacyOperations.has(context.request.op)) {
      return next(context.request) as unknown as Promise<T>;
    }

    const { store } = context.request;
    if (!store._fetchManager) {
      store._fetchManager = new FetchManager(store);
    }

    switch (context.request.op) {
      case 'findRecord':
        return findRecord(context);
      case 'findAll':
        return findAll(context);
      case 'query':
        return query(context);
      case 'queryRecord':
        return queryRecord(context);
      case 'findBelongsTo':
        return findBelongsTo(context);
      case 'findHasMany':
        return findHasMany(context);
      case 'updateRecord':
        return saveRecord(context);
      case 'createRecord':
        return saveRecord(context);
      case 'deleteRecord':
        return saveRecord(context);
      default:
        return next(context.request) as unknown as Promise<T>;
    }
  },
};

function findBelongsTo<T>(context: StoreRequestContext): Promise<T> {
  const { store, data, records: identifiers } = context.request;
  const { options, record, links, useLink, field } = data as {
    record: StableRecordIdentifier;
    options: Record<string, unknown>;
    links?: Links;
    useLink: boolean;
    field: RelationshipSchema;
  };
  const identifier = identifiers?.[0];

  // short circuit if we are already loading
  let pendingRequest =
    identifier && store._fetchManager.getPendingFetch(identifier as StableExistingRecordIdentifier, options);
  if (pendingRequest) {
    return pendingRequest as Promise<T>;
  }

  if (useLink) {
    return _findBelongsTo(store, record, links!.related, field, options) as Promise<T>;
  }

  assert(`Expected an identifier`, Array.isArray(identifiers) && identifiers.length === 1);

  const manager = store._fetchManager;
  assertIdentifierHasId(identifier!);

  return options.reload
    ? (manager.scheduleFetch(identifier, options, context.request) as Promise<T>)
    : (manager.fetchDataIfNeededForIdentifier(identifier, options, context.request) as Promise<T>);
}

function findHasMany<T>(context: StoreRequestContext): Promise<T> {
  const { store, data, records: identifiers } = context.request;
  const { options, record, links, useLink, field } = data as {
    record: StableRecordIdentifier;
    options: Record<string, unknown>;
    links?: PaginationLinks | Links;
    useLink: boolean;
    field: RelationshipSchema;
  };

  // link case
  if (useLink) {
    const adapter = store.adapterFor(record.type);
    /*
    If a relationship was originally populated by the adapter as a link
    (as opposed to a list of IDs), this method is called when the
    relationship is fetched.

    The link (which is usually a URL) is passed through unchanged, so the
    adapter can make whatever request it wants.

    The usual use-case is for the server to register a URL as a link, and
    then use that URL in the future to make a request for the relationship.
  */
    assert(`You tried to load a hasMany relationship but you have no adapter (for ${record.type})`, adapter);
    assert(
      `You tried to load a hasMany relationship from a specified 'link' in the original payload but your adapter does not implement 'findHasMany'`,
      typeof adapter.findHasMany === 'function'
    );

    return _findHasMany(adapter, store, record, links!.related, field, options) as Promise<T>;
  }

  // identifiers case

  const fetches = new Array<globalThis.Promise<StableRecordIdentifier>>(identifiers!.length);
  const manager = store._fetchManager;

  for (let i = 0; i < identifiers!.length; i++) {
    let identifier = identifiers![i];
    // TODO we probably can be lenient here and return from cache for the isNew case
    assertIdentifierHasId(identifier);
    fetches[i] = options.reload
      ? manager.scheduleFetch(identifier, options, context.request)
      : manager.fetchDataIfNeededForIdentifier(identifier, options, context.request);
  }

  return Promise.all(fetches) as Promise<T>;
}

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
      let result: SingleResourceDataDocument;
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
        //We first make sure the primary data has been updated
        const cache = DEPRECATE_V1_RECORD_DATA ? store._instanceCache.getResourceCache(identifier) : store.cache;
        result = cache.didCommit(identifier, { request: context.request, content: payload });

        if (payload && payload.included) {
          store._push({ data: null, included: payload.included }, true);
        }
      });
      return store.peekRecord(result!.data!);
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
  error: Error & { errors?: JsonApiError[]; isAdapterError?: true; code?: string }
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

    let jsonApiErrors: JsonApiError[] = error.errors;
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
function errorsHashToArray(errors: Record<string, string | string[]>): JsonApiError[] {
  const out: JsonApiError[] = [];

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
    promise = store._fetchManager.fetchDataIfNeededForIdentifier(identifier, options, context.request);

    // Refetch if the reload option is passed
  } else if (options.reload) {
    assertIdentifierHasId(identifier);

    promise = store._fetchManager.scheduleFetch(identifier, options, context.request);
  } else {
    let snapshot: Snapshot | null = null;
    let adapter = store.adapterFor(identifier.type);

    // Refetch the record if the adapter thinks the record is stale
    if (
      typeof options.reload === 'undefined' &&
      adapter.shouldReloadRecord &&
      adapter.shouldReloadRecord(store, (snapshot = store._fetchManager.createSnapshot(identifier, options)))
    ) {
      assertIdentifierHasId(identifier);
      if (DEBUG) {
        promise = store._fetchManager.scheduleFetch(
          identifier,
          Object.assign({}, options, { reload: true }),
          context.request
        );
      } else {
        options.reload = true;
        promise = store._fetchManager.scheduleFetch(identifier, options, context.request);
      }
    } else {
      // Trigger the background refetch if backgroundReload option is passed
      if (
        options.backgroundReload !== false &&
        (options.backgroundReload ||
          !adapter.shouldBackgroundReloadRecord ||
          adapter.shouldBackgroundReloadRecord(
            store,
            (snapshot = snapshot || store._fetchManager.createSnapshot(identifier, options))
          ))
      ) {
        assertIdentifierHasId(identifier);

        if (DEBUG) {
          void store._fetchManager.scheduleFetch(
            identifier,
            Object.assign({}, options, { backgroundReload: true }),
            context.request
          );
        } else {
          options.backgroundReload = true;
          void store._fetchManager.scheduleFetch(identifier, options, context.request);
        }
      }

      // Return the cached record
      promise = Promise.resolve(identifier) as Promise<StableRecordIdentifier>;
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
    fetch = _findAll(adapter, store, type, snapshotArray, context.request, true);
  } else {
    fetch = Promise.resolve(store.peekAll(type)) as Promise<T>;

    if (
      options.backgroundReload ||
      (options.backgroundReload !== false &&
        (!adapter.shouldBackgroundReloadAll || adapter.shouldBackgroundReloadAll(store, snapshotArray)))
    ) {
      maybeRecordArray && (maybeRecordArray.isUpdating = true);
      void _findAll(adapter, store, type, snapshotArray, context.request, false);
    }
  }

  return fetch;
}

function _findAll<T>(
  adapter: MinimumAdapterInterface,
  store: Store,
  type: string,
  snapshotArray: SnapshotRecordArray,
  request: StoreRequestInfo,
  isAsyncFlush: boolean
): Promise<T> {
  const schema = store.modelFor(type);
  let promise: Promise<T> = Promise.resolve().then(() =>
    adapter.findAll(store, schema, null, snapshotArray)
  ) as Promise<T>;
  promise = guardDestroyedStore(promise, store) as Promise<T>;

  promise = promise.then((adapterPayload: T) => {
    assert(
      `You made a 'findAll' request for '${type}' records, but the adapter's response did not have any data`,
      payloadIsNotBlank(adapterPayload)
    );
    const serializer = store.serializerFor(type);
    const payload = normalizeResponseHelper(serializer, store, schema, adapterPayload, null, 'findAll');

    store._push(payload, isAsyncFlush);
    snapshotArray._recordArray.isUpdating = false;

    if (LOG_PAYLOADS) {
      // eslint-disable-next-line no-console
      console.log(`request: findAll<${type}> background reload complete`);
    }
    return snapshotArray._recordArray;
  }) as Promise<T>;

  if (TESTING) {
    if (!request.disableTestWaiter) {
      const { waitForPromise } = importSync('@ember/test-waiters') as {
        waitForPromise: <T>(promise: Promise<T>) => Promise<T>;
      };
      promise = waitForPromise(promise);
    }
  }

  return promise;
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

  promise = guardDestroyedStore(promise, store) as Promise<AdapterPayload>;

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
    const identifiers = store._push(payload, true);

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

  promise = guardDestroyedStore(promise, store) as Promise<T>;

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

    const identifier = store._push(payload, true) as StableRecordIdentifier;
    return identifier ? store.peekRecord(identifier) : null;
  }) as Promise<T>;
}
