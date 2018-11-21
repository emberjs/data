import { RecordIdentifier, identifierForIM } from "./record-identifier";
import { default as RSVP, Promise } from 'rsvp';
import { DEBUG } from '@glimmer/env';
import { run as emberRunLoop } from '@ember/runloop';
import Adapter from "@ember/test/adapter";
import { AdapterCache } from "./adapter-cache";
import { assert, warn, inspect } from '@ember/debug';
import Snapshot from './snapshot';
import { guardDestroyedStore, _guard, _bind, _objectIsAlive } from './store/common';
import { normalizeResponseHelper } from './store/serializer-response';
import { serializerForAdapter } from './store/serializers';
import { InvalidError } from '@ember-data/adapter/error';
import coerceId from './coerce-id';
import Ember from 'ember';

import {
  _findHasMany,
  _findBelongsTo,
  _findAll,
  _query,
  _queryRecord,
} from './store/finders';
import RequestCache from "./request-cache";
import { RecordData, RelationshipRecordData } from "./model/record-data";

function payloadIsNotBlank(adapterPayload) {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length;
  }
}

const emberRun = emberRunLoop.backburner;

export interface PendingFetchItem {
  identifier: RecordIdentifier,
  queryRequest: QueryRequest,
  resolver: RSVP.Deferred<any>,
  options: any,
  trace?: any
}

export interface PendingSaveItem {
  resolver: RSVP.Deferred<any>,
  snapshot: Snapshot,
  identifier: RecordIdentifier,
  options: any,
  queryRequest: Request
}

/*
export interface QueryExpression {
  op: string;
  options: { [key: string]: any };
}

export interface FindRecordExpression extends QueryExpression {
  op: 'findRecord';
  record: RecordIdentifier
}

export interface SaveRecordExpression extends QueryExpression {
  op: 'saveRecord';
  record: RecordIdentifier
}

// TODO Name?
export interface QueryRequest {
  query: QueryExpression
}
*/

export interface Operation {
  op: string
}

export interface QueryOperation extends Operation {};

export interface FindRecordQuery extends QueryOperation {
  op: 'findRecord'
  identifier: RecordIdentifier
  options: any
}

export interface MutationOperation extends Operation {};

export interface SaveRecordMutation extends MutationOperation {
  op: 'saveRecord'
  identifier: RecordIdentifier
  options: any
}

export interface Request {
  data: Operation[] | Operation;
  options?: any
}

export interface QueryRequest extends Request {
  data: QueryOperation;
}

export interface MutationRequest extends Request {
  data: MutationOperation[];
}

export interface RequestState {
  state: 'pending' | 'fulfilled' | 'rejected';
  type: 'query' | 'mutation';
  request: Request;
  response?: Response;
}

export interface Response {
  rawData: unknown;
  data: unknown;
}

export default class FetchManager {
  _pendingFetch: Map<string, PendingFetchItem[]>;
  isDestroyed: boolean;
  _adapterCache: AdapterCache;
  _store: any;
  requestCache: RequestCache;
  _pendingSave: PendingSaveItem[];

  constructor(adapterCache: AdapterCache, store: any) {
    // used to keep track of all the find requests that need to be coalesced
    this._pendingFetch = new Map();
    this._adapterCache = adapterCache;
    this._store = store;

    this._pendingSave = [];
    this.requestCache = new RequestCache();
  }

  /**
    This method is called by `record.save`, and gets passed a
    resolver for the promise that `record.save` returns.

    It schedules saving to happen at the end of the run loop.

    @method scheduleSave
    @private
    @param {InternalModel} internalModel
    @param {Resolver} resolver
    @param {Object} options
  */
  scheduleSave(identifier: RecordIdentifier, options: any) {
    let promiseLabel = 'DS: Model#save ' + this;
    let resolver = RSVP.defer(promiseLabel);
    let query: SaveRecordMutation = {
      'op': 'saveRecord',
      identifier,
      options
    }

    let queryRequest: Request = {
      data: query
    }

    let snapshot = new Snapshot(options, identifier, this._store);
    let pendingSaveItem = {
      snapshot: snapshot,
      resolver: resolver,
      identifier,
      options,
      queryRequest
    }
    this._pendingSave.push(pendingSaveItem);
    emberRun.scheduleOnce('actions', this, this._flushPendingSaves);

    this.requestCache.enqueue(resolver.promise, pendingSaveItem.queryRequest);

    return resolver.promise;
  }

  _flushPendingSave(pending: PendingSaveItem) {
    let { snapshot, resolver, identifier } = pending;
    let adapter = this._store.adapterFor(identifier.type);
    let operation;
    let recordData: RelationshipRecordData = this._store.recordDataForIdentifier(identifier);

    if (recordData.isNew()) {
      operation = 'createRecord';
    } else if (recordData.isDeleted()) {
      operation = 'deleteRecord';
    } else {
      operation = 'updateRecord';
    }
    let internalModel = snapshot._internalModel;
    let modelName = snapshot.modelName;
    let store = this._store;
    let modelClass = store.modelFor(modelName);

    assert(`You tried to update a record but you have no adapter (for ${modelName})`, adapter);
    assert(
      `You tried to update a record but your adapter (for ${modelName}) does not implement '${operation}'`,
      typeof adapter[operation] === 'function'
    );

    let promise = Promise.resolve().then(() => adapter[operation](store, modelClass, snapshot));
    let serializer = serializerForAdapter(store, adapter, modelName);
    let label = `DS: Extract and notify about ${operation} completion of ${internalModel}`;

    assert(
      `Your adapter's '${operation}' method must return a value, but it returned 'undefined'`,
      promise !== undefined
    );

    promise = guardDestroyedStore(promise, store, label);
    promise = _guard(promise, _bind(_objectIsAlive, internalModel));


    promise = promise.then(
      adapterPayload => {
        let payload, data, sideloaded;
        if (adapterPayload) {
          payload = normalizeResponseHelper(
            serializer,
            store,
            modelClass,
            adapterPayload,
            snapshot.id,
            operation
          );
          return payload;
        }
      },
      function (error) {
        if (error instanceof InvalidError) {
          let parsedErrors = serializer.extractErrors(store, modelClass, error, snapshot.id);
          throw { error, parsedErrors };
        } else {
          throw { error }
        }
      },
      label
    );
    resolver.resolve(promise);
  }


  /**
    This method is called at the end of the run loop, and
    flushes any records passed into `scheduleSave`

    @method flushPendingSave
    @private
  */
  _flushPendingSaves() {
    let pending = this._pendingSave.slice();
    this._pendingSave = [];
    for (var i = 0, j = pending.length; i < j; i++) {
      let pendingItem = pending[i];
      this._flushPendingSave(pendingItem);
    }
  }

  scheduleFetch(identifier: RecordIdentifier, options: any, shouldTrace: boolean): Promise<any> {
    // TODO Probably the store should pass in the query object


    //debugger
    let query: FindRecordQuery = {
      'op': 'findRecord',
      identifier,
      options
    }

    let queryRequest: QueryRequest = {
      data: query
    }

    // We already have a pending fetch for this
    if (this._pendingFetch.has(identifier.type) && this._pendingFetch.get(identifier.type).find((fetch) => fetch.identifier.id === identifier.id)) {
      return this._pendingFetch.get(identifier.type).find((fetch) => fetch.identifier.id === identifier.id).resolver.promise;
    }
    /*
    if (internalModel._promiseProxy) {
        return internalModel._promiseProxy;
    }
    */

    let id = identifier.id;
    let modelName = identifier.type;

    let resolver = RSVP.defer(`Fetching ${modelName}' with id: ${id}`);
    let pendingFetchItem: PendingFetchItem = {
      identifier,
      resolver,
      options,
      queryRequest
    };

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

    let promise = resolver.promise;

    if (this._pendingFetch.size === 0) {
      emberRun.schedule('actions', this, this.flushAllPendingFetches);
    }

    let fetches = this._pendingFetch;

    if (!fetches.has(modelName)) {
      fetches.set(modelName, []);
    }

    (fetches.get(modelName) as PendingFetchItem[]).push(pendingFetchItem);

    this.requestCache.enqueue(promise, pendingFetchItem.queryRequest);
    return promise;
  }

  _fetchRecord(fetchItem: PendingFetchItem) {

    let identifier = fetchItem.identifier;
    let modelName = identifier.type;
    let adapter = this._store.adapterFor(modelName);

    assert(`You tried to find a record but you have no adapter (for ${modelName})`, adapter);
    assert(
      `You tried to find a record but your adapter (for ${modelName}) does not implement 'findRecord'`,
      typeof adapter.findRecord === 'function'
    );

    let snapshot = new Snapshot(fetchItem.options, identifier, this._store);
    let klass = this._store.modelFor(identifier.type);

    let promise = Promise.resolve().then(() => {
      return adapter.findRecord(this._store, klass, identifier.id, snapshot);
    });

    let id = identifier.id;

    let label = `DS: Handle Adapter#findRecord of '${modelName}' with id: '${id}'`;

    promise = guardDestroyedStore(promise, this._store, label);
    promise = promise.then(
      adapterPayload => {
        assert(
          `You made a 'findRecord' request for a '${modelName}' with id '${id}', but the adapter's response did not have any data`,
          !!payloadIsNotBlank(adapterPayload)
        );
        let serializer = serializerForAdapter(this._store, adapter, modelName);
        let payload = normalizeResponseHelper(
          serializer,
          this._store,
          klass,
          adapterPayload,
          id,
          'findRecord'
        );
        assert(
          `Ember Data expected the primary data returned from a 'findRecord' response to be an object but instead it found an array.`,
          !Array.isArray(payload.data)
        );

        warn(
          `You requested a record of type '${modelName}' with id '${id}' but the adapter returned a payload with primary data having an id of '${
          payload.data.id
          }'. Use 'store.findRecord()' when the requested id is the same as the one returned by the adapter. In other cases use 'store.queryRecord()' instead https://emberjs.com/api/data/classes/DS.Store.html#method_queryRecord`,
          coerceId(payload.data.id) === coerceId(id),
          {
            id: 'ds.store.findRecord.id-mismatch',
          }
        );

        return this._store._push(payload);
      },
      error => {
        /*
        internalModel.notFound();
        if (internalModel.isEmpty()) {
          internalModel.unloadRecord();
        }
        */

        throw error;
      },
      `DS: Extract payload of '${modelName}'`
    );

    fetchItem.resolver.resolve(promise);
  }


  handleFoundRecords(seeking: { [id: string]: PendingFetchItem }, foundInternalModels, expectedInternalModels) {
    // resolve found records
    let found = Object.create(null);
    for (let i = 0, l = foundInternalModels.length; i < l; i++) {
      let internalModel = foundInternalModels[i];
      let pair = seeking[internalModel.id];
      found[internalModel.id] = internalModel;

      if (pair) {
        let resolver = pair.resolver;
        resolver.resolve(internalModel);
      }
    }

    // reject missing records
    let missingInternalModels: any = [];

    for (let i = 0, l = expectedInternalModels.length; i < l; i++) {
      let internalModel = expectedInternalModels[i];

      if (!found[internalModel.id]) {
        missingInternalModels.push(internalModel);
      }
    }

    if (missingInternalModels.length) {
      warn(
        'Ember Data expected to find records with the following ids in the adapter response but they were missing: [ "' +
        missingInternalModels.map(r => r.id).join('", "') +
        '" ]',
        false,
        {
          id: 'ds.store.missing-records-from-adapter',
        }
      );
      this.rejectInternalModels(seeking, missingInternalModels);
    }
  }

  rejectInternalModels(seeking: { [id: string]: PendingFetchItem }, identifiers: RecordIdentifier[], error?) {
    //debugger
    for (let i = 0, l = identifiers.length; i < l; i++) {
      let identifier = identifiers[i];
      let pair = seeking[identifier.id];

      if (pair) {
        pair.resolver.reject(
          error ||
          new Error(
            `Expected: '<${identifier.type}:${identifier.id}>' to be present in the adapter provided payload, but it was not found.`
          )
        );
      }
    }
  }

  _findMany(adapter: any, store: any, modelName: string, snapshots: Snapshot[], identifiers: RecordIdentifier[], optionsMap) {
    let modelClass = store.modelFor(modelName); // `adapter.findMany` gets the modelClass still
    let ids = snapshots.map((s) => s.id);
    let promise = adapter.findMany(store, modelClass, ids, Ember.A(snapshots));
    let label = `DS: Handle Adapter#findMany of '${modelName}'`;

    if (promise === undefined) {
      throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
    }

    promise = guardDestroyedStore(promise, store, label);

    return promise.then(
      adapterPayload => {
        assert(
          `You made a 'findMany' request for '${modelName}' records with ids '[${ids}]', but the adapter's response did not have any data`,
          !!payloadIsNotBlank(adapterPayload)
        );
        let serializer = serializerForAdapter(store, adapter, modelName);
        let payload = normalizeResponseHelper(
          serializer,
          store,
          modelClass,
          adapterPayload,
          null,
          'findMany'
        );
        return store._push(payload);
      },
      null,
      `DS: Extract payload of ${modelName}`
    );
  }


  _processCoalescedGroup(seeking: { [id: string]: PendingFetchItem },  group: Snapshot[], adapter: any, optionsMap, modelName: string) {
    let totalInGroup = group.length;
    let ids = new Array(totalInGroup);
    let groupedIdentifiers = new Array(totalInGroup);

    for (var j = 0; j < totalInGroup; j++) {
      groupedIdentifiers[j] = group[j]._identifier;
      ids[j] = groupedIdentifiers[j].id;
    }

    let store = this._store;
    if (totalInGroup > 1) {
      this._findMany(adapter, store, modelName, group, groupedIdentifiers, optionsMap)
        .then((foundInternalModels) => {
          this.handleFoundRecords(seeking, foundInternalModels, groupedIdentifiers);
        })
        .catch((error) => {
          this.rejectInternalModels(seeking, groupedIdentifiers, error);
        });
    } else if (ids.length === 1) {
      var pair = seeking[groupedIdentifiers[0].id];
      this._fetchRecord(pair);
    } else {
      assert(
        "You cannot return an empty array from adapter's method groupRecordsForFindMany",
        false
      );
    }
  }

  _flushPendingFetchForType(pendingFetchItems: PendingFetchItem[], modelName: string) {
    let store = this;
    let adapter = this._store.adapterFor(modelName);
    let shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    let totalItems = pendingFetchItems.length;
    let identifiers = new Array(totalItems);
    let seeking: { [id: string]: PendingFetchItem } = Object.create(null);

    let optionsMap = new WeakMap();

    for (let i = 0; i < totalItems; i++) {
      let pendingItem = pendingFetchItems[i];
      let identifier = pendingItem.identifier;
      identifiers[i] = identifier;
      optionsMap.set(identifier, pendingItem.options);
      seeking[(identifier.id as string)] = pendingItem;
    }

    if (shouldCoalesce) {
      // TODO: Improve records => snapshots => records => snapshots
      //
      // We want to provide records to all store methods and snapshots to all
      // adapter methods. To make sure we're doing that we're providing an array
      // of snapshots to adapter.groupRecordsForFindMany(), which in turn will
      // return grouped snapshots instead of grouped records.
      //
      // But since the _findMany() finder is a store method we need to get the
      // records from the grouped snapshots even though the _findMany() finder
      // will once again convert the records to snapshots for adapter.findMany()
      let snapshots = new Array(totalItems);
      for (let i = 0; i < totalItems; i++) {
        let options = optionsMap.get(identifiers[i]);
        snapshots[i] = new Snapshot(options, identifiers[i], this._store);
      }

      let groups: Snapshot[][] = adapter.groupRecordsForFindMany(this, snapshots);

      for (var i = 0, l = groups.length; i < l; i++) {
        this._processCoalescedGroup(seeking, groups[i], adapter, optionsMap, modelName);
      }
    } else {
      for (let i = 0; i < totalItems; i++) {
        this._fetchRecord(pendingFetchItems[i]);
      }
    }
  }

  flushAllPendingFetches() {
    if (this.isDestroyed) {
      return;
    }

    this._pendingFetch.forEach(this._flushPendingFetchForType, this);
    this._pendingFetch.clear();
  }

  destroy() {
    this.isDestroyed = true;
  }
}