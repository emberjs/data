/**
 * @module @ember-data/store
 */
import { assert, deprecate, warn } from '@ember/debug';
import { _backburner as emberBackburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

import { importSync, isDevelopingApp } from '@embroider/macros';
import { default as RSVP, resolve } from 'rsvp';

import { HAS_GRAPH_PACKAGE } from '@ember-data/private-build-infra';
import { DEPRECATE_RSVP_PROMISE } from '@ember-data/private-build-infra/deprecations';
import type { CollectionResourceDocument, SingleResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { FindRecordQuery, Request, SaveRecordMutation } from '@ember-data/types/q/fetch-manager';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import { MinimumAdapterInterface } from '@ember-data/types/q/minimum-adapter-interface';
import type { MinimumSerializerInterface } from '@ember-data/types/q/minimum-serializer-interface';
import type { FindOptions } from '@ember-data/types/q/store';

import ShimModelClass from '../legacy-model-support/shim-model-class';
import type Store from '../store-service';
import coerceId from '../utils/coerce-id';
import { _bind, _guard, _objectIsAlive, guardDestroyedStore } from '../utils/common';
import { normalizeResponseHelper } from '../utils/serializer-response';
import RequestCache from './request-cache';
import Snapshot from './snapshot';

function payloadIsNotBlank(adapterPayload): boolean {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length !== 0;
  }
}

type AdapterErrors = Error & { errors?: string[]; isAdapterError?: true };
type SerializerWithParseErrors = MinimumSerializerInterface & {
  extractErrors?(store: Store, modelClass: ShimModelClass, error: AdapterErrors, recordId: string | null): any;
};

export const SaveOp: unique symbol = Symbol('SaveOp');

export type FetchMutationOptions = FindOptions & { [SaveOp]: 'createRecord' | 'deleteRecord' | 'updateRecord' };

interface PendingFetchItem {
  identifier: StableExistingRecordIdentifier;
  queryRequest: Request;
  resolver: RSVP.Deferred<any>;
  options: FindOptions;
  trace?: any;
  promise: Promise<StableRecordIdentifier>;
}

interface PendingSaveItem {
  resolver: RSVP.Deferred<any>;
  snapshot: Snapshot;
  identifier: RecordIdentifier;
  options: FetchMutationOptions;
  queryRequest: Request;
}

/**
 * Manages the state of network requests initiated by the store
 *
 * @class FetchManager
 * @private
 */
export default class FetchManager {
  declare isDestroyed: boolean;
  declare requestCache: RequestCache;
  // saves which are pending in the runloop
  declare _pendingSave: PendingSaveItem[];
  // fetches pending in the runloop, waiting to be coalesced
  declare _pendingFetch: Map<string, PendingFetchItem[]>;
  declare _store: Store;

  constructor(store: Store) {
    this._store = store;
    // used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = new Map();
    this._pendingSave = [];
    this.requestCache = new RequestCache();
    this.isDestroyed = false;
  }

  clearEntries(identifier: StableRecordIdentifier) {
    this.requestCache._done.delete(identifier);
  }

  /**
    This method is called by `record.save`, and gets passed a
    resolver for the promise that `record.save` returns.

    It schedules saving to happen at the end of the run loop.

    @internal
  */
  scheduleSave(identifier: RecordIdentifier, options: FetchMutationOptions): Promise<null | SingleResourceDocument> {
    let promiseLabel = 'DS: Model#save ' + this;
    let resolver = RSVP.defer<null | SingleResourceDocument>(promiseLabel);
    let query: SaveRecordMutation = {
      op: 'saveRecord',
      recordIdentifier: identifier,
      options,
    };

    let queryRequest: Request = {
      data: [query],
    };

    let snapshot = new Snapshot(options, identifier, this._store);
    let pendingSaveItem = {
      snapshot: snapshot,
      resolver: resolver,
      identifier,
      options,
      queryRequest,
    };
    this._pendingSave.push(pendingSaveItem);
    emberBackburner.scheduleOnce('actions', this, this._flushPendingSaves);

    this.requestCache.enqueue(resolver.promise, pendingSaveItem.queryRequest);

    return resolver.promise;
  }

  /**
    This method is called at the end of the run loop, and
    flushes any records passed into `scheduleSave`

    @method flushPendingSave
    @internal
  */
  _flushPendingSaves() {
    const store = this._store;
    let pending = this._pendingSave.slice();
    this._pendingSave = [];
    for (let i = 0, j = pending.length; i < j; i++) {
      let pendingItem = pending[i];
      _flushPendingSave(store, pendingItem);
    }
  }

  scheduleFetch(identifier: StableExistingRecordIdentifier, options: FindOptions): Promise<StableRecordIdentifier> {
    // TODO Probably the store should pass in the query object
    let shouldTrace = isDevelopingApp() && this._store.generateStackTracesForTrackedRequests;

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

    let id = identifier.id;
    let modelName = identifier.type;

    let resolver = RSVP.defer<SingleResourceDocument>(`Fetching ${modelName}' with id: ${id}`);
    let pendingFetchItem: PendingFetchItem = {
      identifier,
      resolver,
      options,
      queryRequest,
    } as PendingFetchItem;

    if (DEBUG) {
      if (shouldTrace) {
        let trace;

        try {
          throw new Error(`Trace Origin for scheduled fetch for ${modelName}:${id}.`);
        } catch (e) {
          trace = e;
        }

        // enable folks to discover the origin of this findRecord call when
        // debugging. Ideally we would have a tracked queue for requests with
        // labels or local IDs that could be used to merge this trace with
        // the trace made available when we detect an async leak
        pendingFetchItem.trace = trace;
      }
    }

    let resolverPromise = resolver.promise;
    const store = this._store;
    const isLoading = !store._instanceCache.recordIsLoaded(identifier); // we don't use isLoading directly because we are the request

    const promise = resolverPromise.then(
      (payload) => {
        // ensure that regardless of id returned we assign to the correct record
        if (payload.data && !Array.isArray(payload.data)) {
          payload.data.lid = identifier.lid;
        }

        // additional data received in the payload
        // may result in the merging of identifiers (and thus records)
        let potentiallyNewIm = store._push(payload);
        if (potentiallyNewIm && !Array.isArray(potentiallyNewIm)) {
          return potentiallyNewIm;
        }

        return identifier;
      },
      (error) => {
        const recordData = store._instanceCache.peek({ identifier, bucket: 'recordData' });
        if (!recordData || recordData.isEmpty(identifier) || isLoading) {
          let isReleasable = true;
          if (!recordData && HAS_GRAPH_PACKAGE) {
            const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
              .graphFor;
            const graph = graphFor(store);
            isReleasable = graph.isReleasable(identifier);
            if (!isReleasable) {
              graph.unload(identifier, true);
            }
          }
          if (recordData || isReleasable) {
            store._instanceCache.unloadRecord(identifier);
          }
        }
        throw error;
      }
    );

    if (this._pendingFetch.size === 0) {
      emberBackburner.schedule('actions', this, this.flushAllPendingFetches);
    }

    let fetches = this._pendingFetch;

    if (!fetches.has(modelName)) {
      fetches.set(modelName, []);
    }

    (fetches.get(modelName) as PendingFetchItem[]).push(pendingFetchItem);

    pendingFetchItem.promise = promise;
    this.requestCache.enqueue(resolverPromise, pendingFetchItem.queryRequest);
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

  destroy() {
    this.isDestroyed = true;
  }
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
  const ids = snapshots.map((s) => s.id!);
  assert(
    `Cannot fetch a record without an id`,
    ids.every((v) => v !== null)
  );
  assert(`Expected this adapter to implement findMany for coalescing`, adapter.findMany);
  let promise = adapter.findMany(store, modelClass, ids, snapshots);
  let label = `DS: Handle Adapter#findMany of '${modelName}'`;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = guardDestroyedStore(promise, store, label);

  return promise.then((adapterPayload) => {
    assert(
      `You made a 'findMany' request for '${modelName}' records with ids '[${ids}]', but the adapter's response did not have any data`,
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
            `Expected: '<${snapshot.modelName}:${snapshot.id}>' to be present in the adapter provided payload, but it was not found.`
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
    store._push({ data: null, included });
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

function _fetchRecord(store: Store, fetchItem: PendingFetchItem) {
  let identifier = fetchItem.identifier;
  let modelName = identifier.type;
  let adapter = store.adapterFor(modelName);

  assert(`You tried to find a record but you have no adapter (for ${modelName})`, adapter);
  assert(
    `You tried to find a record but your adapter (for ${modelName}) does not implement 'findRecord'`,
    typeof adapter.findRecord === 'function'
  );

  let snapshot = new Snapshot(fetchItem.options, identifier, store);
  let klass = store.modelFor(identifier.type);
  let id = identifier.id;
  let label = `DS: Handle Adapter#findRecord of '${modelName}' with id: '${id}'`;

  let promise = guardDestroyedStore(
    resolve().then(() => {
      return adapter.findRecord(store, klass, identifier.id, snapshot);
    }),
    store,
    label
  ).then((adapterPayload) => {
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
  });

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
    _fetchRecord(store, fetchMap.get(group[0])!);
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
    let fetchMap = new Map();
    for (let i = 0; i < totalItems; i++) {
      let fetchItem = pendingFetchItems[i];
      snapshots[i] = new Snapshot(fetchItem.options, fetchItem.identifier, store);
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
      _fetchRecord(store, pendingFetchItems[i]);
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

  let promise = resolve().then(() => adapter[operation](store, modelClass, snapshot));
  let serializer: SerializerWithParseErrors | null = store.serializerFor(modelName);
  let label = `DS: Extract and notify about ${operation} completion of ${identifier}`;

  assert(
    `Your adapter's '${operation}' method must return a value, but it returned 'undefined'`,
    promise !== undefined
  );

  promise = _guard(guardDestroyedStore(promise, store, label), _bind(_objectIsAlive, record)).then((adapterPayload) => {
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
  });
  resolver.resolve(promise);
}
