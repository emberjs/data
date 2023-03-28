import { assert, deprecate, warn } from '@ember/debug';

import { importSync } from '@embroider/macros';

import { DEBUG, TESTING } from '@ember-data/env';
import { HAS_GRAPH_PACKAGE } from '@ember-data/private-build-infra';
import { DEPRECATE_RSVP_PROMISE, DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/current-deprecations';
import { createDeferred } from '@ember-data/request';
import type { Deferred } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import { coerceId } from '@ember-data/store/-private';
import { StoreRequestInfo } from '@ember-data/store/-private/cache-handler';
import type { InstanceCache } from '@ember-data/store/-private/caches/instance-cache';
import type ShimModelClass from '@ember-data/store/-private/legacy-model-support/shim-model-class';
import type RequestCache from '@ember-data/store/-private/network/request-cache';
import type { CollectionResourceDocument, SingleResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { FindRecordQuery, Request, SaveRecordMutation } from '@ember-data/types/q/fetch-manager';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import { AdapterPayload, MinimumAdapterInterface } from '@ember-data/types/q/minimum-adapter-interface';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';
import type { FindOptions } from '@ember-data/types/q/store';

import { _objectIsAlive, guardDestroyedStore } from './common';
import { assertIdentifierHasId } from './identifier-has-id';
import { payloadIsNotBlank } from './legacy-data-utils';
import { normalizeResponseHelper } from './serializer-response';
import Snapshot from './snapshot';

type AdapterErrors = Error & { errors?: string[]; isAdapterError?: true };
type SerializerWithParseErrors = MinimumSerializerInterface & {
  extractErrors?(store: Store, modelClass: ShimModelClass, error: AdapterErrors, recordId: string | null): unknown;
};

export const SaveOp: unique symbol = Symbol('SaveOp');

export type FetchMutationOptions = FindOptions & { [SaveOp]: 'createRecord' | 'deleteRecord' | 'updateRecord' };

interface PendingFetchItem {
  identifier: StableExistingRecordIdentifier;
  queryRequest: Request;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolver: Deferred<any>;
  options: FindOptions;
  trace?: unknown;
  promise: Promise<StableRecordIdentifier>;
}

interface PendingSaveItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolver: Deferred<any>;
  snapshot: Snapshot;
  identifier: RecordIdentifier;
  options: FetchMutationOptions;
  queryRequest: Request;
}

export default class FetchManager {
  declare isDestroyed: boolean;
  declare requestCache: RequestCache;
  // fetches pending in the runloop, waiting to be coalesced
  declare _pendingFetch: Map<string, PendingFetchItem[]>;
  declare _store: Store;

  constructor(store: Store) {
    this._store = store;
    // used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = new Map();
    this.requestCache = store.getRequestStateService();
    this.isDestroyed = false;
  }

  createSnapshot(identifier: StableRecordIdentifier, options: FindOptions = {}): Snapshot {
    return new Snapshot(options, identifier, this._store);
  }

  /**
    This method is called by `record.save`, and gets passed a
    resolver for the promise that `record.save` returns.

    It schedules saving to happen at the end of the run loop.

    @internal
  */
  scheduleSave(identifier: RecordIdentifier, options: FetchMutationOptions): Promise<null | SingleResourceDocument> {
    let resolver = createDeferred<SingleResourceDocument | null>();
    let query: SaveRecordMutation = {
      op: 'saveRecord',
      recordIdentifier: identifier,
      options,
    };

    let queryRequest: Request = {
      data: [query],
    };

    const snapshot = this.createSnapshot(identifier, options);
    const pendingSaveItem: PendingSaveItem = {
      snapshot: snapshot,
      resolver: resolver,
      identifier,
      options,
      queryRequest,
    };

    const monitored = this.requestCache.enqueue(resolver.promise, pendingSaveItem.queryRequest);
    _flushPendingSave(this._store, pendingSaveItem);

    return monitored;
  }

  scheduleFetch(
    identifier: StableExistingRecordIdentifier,
    options: FindOptions,
    request: StoreRequestInfo
  ): Promise<StableRecordIdentifier> {
    let query: FindRecordQuery = {
      op: 'findRecord',
      recordIdentifier: identifier,
      options,
    };

    let queryRequest: Request = {
      data: [query],
    };

    let pendingFetch = this.getPendingFetch(identifier, options);
    if (pendingFetch) {
      return pendingFetch;
    }

    let modelName = identifier.type;

    const resolver = createDeferred<SingleResourceDocument>();
    const pendingFetchItem: PendingFetchItem = {
      identifier,
      resolver,
      options,
      queryRequest,
    } as PendingFetchItem;

    let resolverPromise = resolver.promise;
    const store = this._store;
    const isInitialLoad = !store._instanceCache.recordIsLoaded(identifier); // we don't use isLoading directly because we are the request

    const monitored = this.requestCache.enqueue(resolverPromise, pendingFetchItem.queryRequest);
    let promise = monitored.then(
      (payload) => {
        // ensure that regardless of id returned we assign to the correct record
        if (payload.data && !Array.isArray(payload.data)) {
          payload.data.lid = identifier.lid;
        }

        // additional data received in the payload
        // may result in the merging of identifiers (and thus records)
        let potentiallyNewIm = store._push(payload, options.reload);
        if (potentiallyNewIm && !Array.isArray(potentiallyNewIm)) {
          return potentiallyNewIm;
        }

        return identifier;
      },
      (error) => {
        assert(`Async Leak Detected: Expected the store to not be destroyed`, !store.isDestroyed);
        const cache = DEPRECATE_V1_RECORD_DATA
          ? store._instanceCache.peek({ identifier, bucket: 'resourceCache' })
          : store.cache;
        if (!cache || cache.isEmpty(identifier) || isInitialLoad) {
          let isReleasable = true;
          if (HAS_GRAPH_PACKAGE) {
            if (!cache) {
              const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
                .graphFor;
              const graph = graphFor(store);
              isReleasable = graph.isReleasable(identifier);
              if (!isReleasable) {
                graph.unload(identifier, true);
              }
            }
          }
          if (cache || isReleasable) {
            store._enableAsyncFlush = true;
            store._instanceCache.unloadRecord(identifier);
            store._enableAsyncFlush = null;
          }
        }
        throw error;
      }
    );

    if (this._pendingFetch.size === 0) {
      void new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        this.flushAllPendingFetches();
      });
    }

    let fetches = this._pendingFetch;

    if (!fetches.has(modelName)) {
      fetches.set(modelName, []);
    }

    (fetches.get(modelName) as PendingFetchItem[]).push(pendingFetchItem);

    if (TESTING) {
      if (!request.disableTestWaiter) {
        const { waitForPromise } = importSync('@ember/test-waiters') as {
          waitForPromise: <T>(promise: Promise<T>) => Promise<T>;
        };
        promise = waitForPromise(promise);
      }
    }

    pendingFetchItem.promise = promise;
    return promise;
  }

  getPendingFetch(identifier: StableRecordIdentifier, options: FindOptions) {
    let pendingFetches = this._pendingFetch.get(identifier.type);

    // We already have a pending fetch for this
    if (pendingFetches) {
      let matchingPendingFetch = pendingFetches.find(
        (fetch) => fetch.identifier === identifier && isSameRequest(options, fetch.options)
      );
      if (matchingPendingFetch) {
        return matchingPendingFetch.promise;
      }
    }
  }

  flushAllPendingFetches() {
    if (this.isDestroyed) {
      return;
    }

    const store = this._store;
    this._pendingFetch.forEach((fetchItem, type) => _flushPendingFetchForType(store, fetchItem, type));
    this._pendingFetch.clear();
  }

  fetchDataIfNeededForIdentifier(
    identifier: StableRecordIdentifier,
    options: FindOptions = {},
    request: StoreRequestInfo
  ): Promise<StableRecordIdentifier> {
    // pre-loading will change the isEmpty value
    const isEmpty = _isEmpty(this._store._instanceCache, identifier);
    const isLoading = _isLoading(this._store._instanceCache, identifier);

    let promise: Promise<StableRecordIdentifier>;
    if (isEmpty) {
      assertIdentifierHasId(identifier);

      if (DEBUG) {
        promise = this.scheduleFetch(identifier, Object.assign({}, options, { reload: true }), request);
      } else {
        options.reload = true;
        promise = this.scheduleFetch(identifier, options, request);
      }
    } else if (isLoading) {
      promise = this.getPendingFetch(identifier, options)!;
      assert(`Expected to find a pending request for a record in the loading state, but found none`, promise);
    } else {
      promise = Promise.resolve(identifier);
    }

    return promise;
  }

  destroy() {
    this.isDestroyed = true;
  }
}

function _isEmpty(instanceCache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const cache = DEPRECATE_V1_RECORD_DATA
    ? instanceCache.__instances.resourceCache.get(identifier)
    : instanceCache.cache;
  if (!cache) {
    return true;
  }
  const isNew = cache.isNew(identifier);
  const isDeleted = cache.isDeleted(identifier);
  const isEmpty = cache.isEmpty(identifier);

  return (!isNew || isDeleted) && isEmpty;
}

function _isLoading(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const req = cache.store.getRequestStateService();
  // const fulfilled = req.getLastRequestForRecord(identifier);
  const isLoaded = cache.recordIsLoaded(identifier);

  return (
    !isLoaded &&
    // fulfilled === null &&
    req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query')
  );
}

// this function helps resolve whether we have a pending request that we should use instead
function isSameRequest(options: FindOptions = {}, existingOptions: FindOptions = {}) {
  let includedMatches = !options.include || options.include === existingOptions.include;
  let adapterOptionsMatches = options.adapterOptions === existingOptions.adapterOptions;

  return includedMatches && adapterOptionsMatches;
}

function _findMany(
  store: Store,
  adapter: MinimumAdapterInterface,
  modelName: string,
  snapshots: Snapshot[]
): Promise<CollectionResourceDocument> {
  let modelClass = store.modelFor(modelName); // `adapter.findMany` gets the modelClass still
  let promise = Promise.resolve().then(() => {
    const ids = snapshots.map((s) => s.id!);
    assert(
      `Cannot fetch a record without an id`,
      ids.every((v) => v !== null)
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    assert(`Expected this adapter to implement findMany for coalescing`, adapter.findMany);
    let ret = adapter.findMany(store, modelClass, ids, snapshots);
    assert('adapter.findMany returned undefined, this was very likely a mistake', ret !== undefined);
    return ret;
  });

  promise = guardDestroyedStore(promise, store) as Promise<AdapterPayload>;

  return promise.then((adapterPayload) => {
    assert(
      `You made a 'findMany' request for '${modelName}' records with ids '[${snapshots
        .map((s) => s.id!)
        .join(',')}]', but the adapter's response did not have any data`,
      !!payloadIsNotBlank(adapterPayload)
    );
    let serializer = store.serializerFor(modelName);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findMany');
    return payload as CollectionResourceDocument;
  });
}

function rejectFetchedItems(fetchMap: Map<Snapshot, PendingFetchItem>, snapshots: Snapshot[], error?) {
  for (let i = 0, l = snapshots.length; i < l; i++) {
    let snapshot = snapshots[i];
    let pair = fetchMap.get(snapshot);

    if (pair) {
      pair.resolver.reject(
        error ||
          new Error(
            `Expected: '<${
              snapshot.modelName
            }:${snapshot.id!}>' to be present in the adapter provided payload, but it was not found.`
          )
      );
    }
  }
}

function handleFoundRecords(
  store: Store,
  fetchMap: Map<Snapshot, PendingFetchItem>,
  snapshots: Snapshot[],
  coalescedPayload: CollectionResourceDocument
) {
  /*
    It is possible that the same ID is included multiple times
    via multiple snapshots. This happens when more than one
    options hash was supplied, each of which must be uniquely
    accounted for.

    However, since we can't map from response to a specific
    options object, we resolve all snapshots by id with
    the first response we see.
  */
  let snapshotsById = new Map<string, Snapshot[]>();
  for (let i = 0; i < snapshots.length; i++) {
    let id = snapshots[i].id!;
    let snapshotGroup = snapshotsById.get(id);
    if (!snapshotGroup) {
      snapshotGroup = [];
      snapshotsById.set(id, snapshotGroup);
    }
    snapshotGroup.push(snapshots[i]);
  }

  const included = Array.isArray(coalescedPayload.included) ? coalescedPayload.included : [];

  // resolve found records
  let resources = coalescedPayload.data;
  for (let i = 0, l = resources.length; i < l; i++) {
    let resource = resources[i];
    let snapshotGroup = snapshotsById.get(resource.id);
    snapshotsById.delete(resource.id);

    if (!snapshotGroup) {
      // TODO consider whether this should be a deprecation/assertion
      included.push(resource);
    } else {
      snapshotGroup.forEach((snapshot) => {
        let pair = fetchMap.get(snapshot)!;
        let resolver = pair.resolver;
        resolver.resolve({ data: resource });
      });
    }
  }

  if (included.length > 0) {
    store._push({ data: null, included }, true);
  }

  if (snapshotsById.size === 0) {
    return;
  }

  // reject missing records
  let rejected: Snapshot[] = [];
  snapshotsById.forEach((snapshots) => {
    rejected.push(...snapshots);
  });
  warn(
    'Ember Data expected to find records with the following ids in the adapter response from findMany but they were missing: [ "' +
      [...snapshotsById.values()].map((r) => r[0].id).join('", "') +
      '" ]',
    {
      id: 'ds.store.missing-records-from-adapter',
    }
  );

  rejectFetchedItems(fetchMap, rejected);
}

function _fetchRecord(store: Store, adapter: MinimumAdapterInterface, fetchItem: PendingFetchItem) {
  let identifier = fetchItem.identifier;
  let modelName = identifier.type;

  assert(`You tried to find a record but you have no adapter (for ${modelName})`, adapter);
  assert(
    `You tried to find a record but your adapter (for ${modelName}) does not implement 'findRecord'`,
    typeof adapter.findRecord === 'function'
  );

  let snapshot = store._fetchManager.createSnapshot(identifier, fetchItem.options);
  let klass = store.modelFor(identifier.type);
  let id = identifier.id;

  let promise = Promise.resolve().then(() => {
    return adapter.findRecord(store, klass, identifier.id, snapshot);
  });

  promise = promise.then((adapterPayload) => {
    assert(`Async Leak Detected: Expected the store to not be destroyed`, _objectIsAlive(store));
    assert(
      `You made a 'findRecord' request for a '${modelName}' with id '${id}', but the adapter's response did not have any data`,
      !!payloadIsNotBlank(adapterPayload)
    );
    let serializer = store.serializerFor(modelName);
    let payload = normalizeResponseHelper(serializer, store, klass, adapterPayload, id, 'findRecord');
    assert(
      `Ember Data expected the primary data returned from a 'findRecord' response to be an object but instead it found an array.`,
      !Array.isArray(payload.data)
    );
    assert(
      `The 'findRecord' request for ${modelName}:${id} resolved indicating success but contained no primary data. To indicate a 404 not found you should either reject the promise returned by the adapter's findRecord method or throw a NotFoundError.`,
      'data' in payload && payload.data !== null && typeof payload.data === 'object'
    );

    warn(
      `You requested a record of type '${modelName}' with id '${id}' but the adapter returned a payload with primary data having an id of '${payload.data.id}'. Use 'store.findRecord()' when the requested id is the same as the one returned by the adapter. In other cases use 'store.queryRecord()' instead.`,
      coerceId(payload.data.id) === coerceId(id),
      {
        id: 'ds.store.findRecord.id-mismatch',
      }
    );

    return payload;
  }) as Promise<AdapterPayload>;

  fetchItem.resolver.resolve(promise);
}

function _processCoalescedGroup(
  store: Store,
  fetchMap: Map<Snapshot, PendingFetchItem>,
  group: Snapshot[],
  adapter: MinimumAdapterInterface,
  modelName: string
) {
  if (group.length > 1) {
    _findMany(store, adapter, modelName, group)
      .then((payloads: CollectionResourceDocument) => {
        handleFoundRecords(store, fetchMap, group, payloads);
      })
      .catch((error) => {
        rejectFetchedItems(fetchMap, group, error);
      });
  } else if (group.length === 1) {
    _fetchRecord(store, adapter, fetchMap.get(group[0])!);
  } else {
    assert("You cannot return an empty array from adapter's method groupRecordsForFindMany", false);
  }
}

function _flushPendingFetchForType(store: Store, pendingFetchItems: PendingFetchItem[], modelName: string) {
  let adapter = store.adapterFor(modelName);
  let shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
  let totalItems = pendingFetchItems.length;

  if (shouldCoalesce) {
    let snapshots = new Array<Snapshot>(totalItems);
    let fetchMap = new Map<Snapshot, PendingFetchItem>();
    for (let i = 0; i < totalItems; i++) {
      let fetchItem = pendingFetchItems[i];
      snapshots[i] = store._fetchManager.createSnapshot(fetchItem.identifier, fetchItem.options);
      fetchMap.set(snapshots[i], fetchItem);
    }

    let groups: Snapshot[][];
    if (adapter.groupRecordsForFindMany) {
      groups = adapter.groupRecordsForFindMany(store, snapshots);
    } else {
      groups = [snapshots];
    }

    for (let i = 0, l = groups.length; i < l; i++) {
      _processCoalescedGroup(store, fetchMap, groups[i], adapter, modelName);
    }
  } else {
    for (let i = 0; i < totalItems; i++) {
      void _fetchRecord(store, adapter, pendingFetchItems[i]);
    }
  }
}

function _flushPendingSave(store: Store, pending: PendingSaveItem) {
  const { snapshot, resolver, identifier, options } = pending;
  const adapter = store.adapterFor(identifier.type);
  const operation = options[SaveOp];

  let modelName = snapshot.modelName;
  let modelClass = store.modelFor(modelName);
  const record = store._instanceCache.getRecord(identifier);

  assert(`You tried to update a record but you have no adapter (for ${modelName})`, adapter);
  assert(
    `You tried to update a record but your adapter (for ${modelName}) does not implement '${operation}'`,
    typeof adapter[operation] === 'function'
  );

  let promise: Promise<AdapterPayload> = Promise.resolve().then(() => adapter[operation](store, modelClass, snapshot));
  let serializer: SerializerWithParseErrors | null = store.serializerFor(modelName);

  assert(
    `Your adapter's '${operation}' method must return a value, but it returned 'undefined'`,
    promise !== undefined
  );

  promise = promise.then((adapterPayload) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (!_objectIsAlive(record)) {
      if (DEPRECATE_RSVP_PROMISE) {
        deprecate(
          `A Promise while saving ${modelName} did not resolve by the time your model was destroyed. This will error in a future release.`,
          false,
          {
            id: 'ember-data:rsvp-unresolved-async',
            until: '5.0',
            for: '@ember-data/store',
            since: {
              available: '4.5',
              enabled: '4.5',
            },
          }
        );
      }
    }

    if (adapterPayload) {
      return normalizeResponseHelper(serializer, store, modelClass, adapterPayload, snapshot.id, operation);
    }
  }) as Promise<AdapterPayload>;

  resolver.resolve(promise);
}
