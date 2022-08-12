import { assert, deprecate, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { importSync } from '@embroider/macros';
import { resolve } from 'rsvp';

import { HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import { LOG_INSTANCE_CACHE } from '@ember-data/private-build-infra/debugging';
import { DEPRECATE_V1CACHE_STORE_APIS } from '@ember-data/private-build-infra/deprecations';
import type { Graph, peekGraph } from '@ember-data/record-data/-private/graph/index';
import type { ExistingResourceObject, ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import { JsonApiRelationship, JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import { RelationshipSchema } from '@ember-data/types/q/record-data-schemas';
import type { RecordDataStoreWrapper as StoreWrapper } from '@ember-data/types/q/record-data-store-wrapper';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import { Dict } from '@ember-data/types/q/utils';

import RecordReference from '../legacy-model-support/record-reference';
import { RecordDataStoreWrapper } from '../managers/record-data-store-wrapper';
import Snapshot from '../network/snapshot';
import type { CreateRecordProperties } from '../store-service';
import type Store from '../store-service';
import { assertIdentifierHasId } from '../store-service';
import coerceId, { ensureStringId } from '../utils/coerce-id';
import constructResource from '../utils/construct-resource';
import normalizeModelName from '../utils/normalize-model-name';
import WeakCache, { DebugWeakCache } from '../utils/weak-cache';
import recordDataFor, { removeRecordDataFor, setRecordDataFor } from './record-data-for';

let _peekGraph: peekGraph;
if (HAS_RECORD_DATA_PACKAGE) {
  let __peekGraph: peekGraph;
  _peekGraph = (wrapper: Store | StoreWrapper): Graph | undefined => {
    let a = (importSync('@ember-data/record-data/-private') as { peekGraph: peekGraph }).peekGraph;
    __peekGraph = __peekGraph || a;
    return __peekGraph(wrapper);
  };
}

/**
  @module @ember-data/store
*/

const RecordCache = new WeakCache<RecordInstance | RecordData, StableRecordIdentifier>(DEBUG ? 'identifier' : '');
if (DEBUG) {
  RecordCache._expectMsg = (key: RecordInstance | RecordData) =>
    `${String(key)} is not a record instantiated by @ember-data/store`;
}

export function peekRecordIdentifier(record: RecordInstance | RecordData): StableRecordIdentifier | undefined {
  return RecordCache.get(record);
}

/**
  Retrieves the unique referentially-stable [RecordIdentifier](/ember-data/release/classes/StableRecordIdentifier)
  assigned to the given record instance.
  ```js
  import { recordIdentifierFor } from "@ember-data/store";
  // ... gain access to a record, for instance with peekRecord or findRecord
  const record = store.peekRecord("user", "1");
  // get the identifier for the record (see docs for StableRecordIdentifier)
  const identifier = recordIdentifierFor(record);
  // access the identifier's properties.
  const { id, type, lid } = identifier;
  ```
  @method recordIdentifierFor
  @public
  @static
  @for @ember-data/store
  @param {Object} record a record instance previously obstained from the store.
  @returns {StableRecordIdentifier}
 */
export function recordIdentifierFor(record: RecordInstance | RecordData): StableRecordIdentifier {
  return RecordCache.getWithError(record);
}

export function setRecordIdentifier(record: RecordInstance | RecordData, identifier: StableRecordIdentifier): void {
  if (DEBUG && RecordCache.has(record) && RecordCache.get(record) !== identifier) {
    throw new Error(`${String(record)} was already assigned an identifier`);
  }

  /*
  It would be nice to do a reverse check here that an identifier has not
  previously been assigned a record; however, unload + rematerialization
  prevents us from having a great way of doing so when CustomRecordClasses
  don't necessarily give us access to a `isDestroyed` for dematerialized
  instance.
  */

  RecordCache.set(record, identifier);
}

export const StoreMap = new WeakCache<RecordInstance, Store>(DEBUG ? 'store' : '');

export function storeFor(record: RecordInstance): Store | undefined {
  const store = StoreMap.get(record);

  assert(
    `A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.`,
    store
  );
  return store;
}

type Caches = {
  record: WeakMap<StableRecordIdentifier, RecordInstance>;
  recordData: WeakMap<StableRecordIdentifier, RecordData>;
  reference: DebugWeakCache<StableRecordIdentifier, RecordReference>;
};

export class InstanceCache {
  declare store: Store;
  declare _storeWrapper: RecordDataStoreWrapper;
  declare peekList: Dict<Set<StableRecordIdentifier>>;
  declare __recordDataFor: (resource: RecordIdentifier) => RecordData;

  #instances: Caches = {
    record: new WeakMap<StableRecordIdentifier, RecordInstance>(),
    recordData: new WeakMap<StableRecordIdentifier, RecordData>(),
    reference: new WeakCache<StableRecordIdentifier, RecordReference>(DEBUG ? 'reference' : ''),
  };

  recordIsLoaded(identifier: StableRecordIdentifier, filterDeleted: boolean = false) {
    const recordData = this.peek({ identifier, bucket: 'recordData' });
    if (!recordData) {
      return false;
    }
    const isNew = recordData.isNew();
    const isEmpty = recordData.isEmpty?.() || false;

    // if we are new we must consider ourselves loaded
    if (isNew) {
      return true;
    }
    // even if we have a past request, if we are now empty we are not loaded
    // typically this is true after an unloadRecord call

    // if we are not empty, not new && we have a fulfilled request then we are loaded
    // we should consider allowing for something to be loaded that is simply "not empty".
    // which is how RecordState currently handles this case; however, RecordState is buggy
    // in that it does not account for unloading.
    // return !isEmpty;

    const req = this.store.getRequestStateService();
    const fulfilled = req.getLastRequestForRecord(identifier);
    const isLoading =
      fulfilled !== null && req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query');

    if (isEmpty || (filterDeleted && recordData.isDeletionCommitted()) || isLoading) {
      return false;
    }

    return true;
  }

  constructor(store: Store) {
    this.store = store;
    this.peekList = Object.create(null) as Dict<Set<StableRecordIdentifier>>;

    this._storeWrapper = new RecordDataStoreWrapper(this.store);
    this.__recordDataFor = (resource: RecordIdentifier) => {
      // TODO enforce strict
      const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource);
      return this.getRecordData(identifier);
    };

    this.#instances.reference._generator = (identifier) => {
      return new RecordReference(this.store, identifier);
    };

    store.identifierCache.__configureMerge(
      (identifier: StableRecordIdentifier, matchedIdentifier: StableRecordIdentifier, resourceData) => {
        let intendedIdentifier = identifier;
        if (identifier.id !== matchedIdentifier.id) {
          intendedIdentifier =
            'id' in resourceData && identifier.id === resourceData.id ? identifier : matchedIdentifier;
        } else if (identifier.type !== matchedIdentifier.type) {
          intendedIdentifier =
            'type' in resourceData && identifier.type === resourceData.type ? identifier : matchedIdentifier;
        }
        let altIdentifier = identifier === intendedIdentifier ? matchedIdentifier : identifier;

        // check for duplicate entities
        let imHasRecord = this.#instances.record.has(intendedIdentifier);
        let otherHasRecord = this.#instances.record.has(altIdentifier);
        let imRecordData = this.#instances.recordData.get(intendedIdentifier) || null;
        let otherRecordData = this.#instances.recordData.get(altIdentifier) || null;

        // we cannot merge entities when both have records
        // (this may not be strictly true, we could probably swap the recordData the record points at)
        if (imHasRecord && otherHasRecord) {
          // TODO we probably don't need to throw these errors anymore
          // we can probably just "swap" what data source the abandoned
          // record points at so long as
          // it itself is not retained by the store in any way.
          if ('id' in resourceData) {
            throw new Error(
              `Failed to update the 'id' for the RecordIdentifier '${identifier.type}:${String(identifier.id)} (${
                identifier.lid
              })' to '${String(resourceData.id)}', because that id is already in use by '${
                matchedIdentifier.type
              }:${String(matchedIdentifier.id)} (${matchedIdentifier.lid})'`
            );
          }
          // TODO @runspired determine when this is even possible
          assert(
            `Failed to update the RecordIdentifier '${identifier.type}:${String(identifier.id)} (${
              identifier.lid
            })' to merge with the detected duplicate identifier '${matchedIdentifier.type}:${String(
              matchedIdentifier.id
            )} (${String(matchedIdentifier.lid)})'`
          );
        }

        // remove "other" from cache
        if (otherHasRecord) {
          // TODO probably need to release other things
          this.peekList[altIdentifier.type]?.delete(altIdentifier);
        }

        if (imRecordData === null && otherRecordData === null) {
          // nothing more to do
          return intendedIdentifier;

          // only the other has a RecordData
          // OR only the other has a Record
        } else if (
          (imRecordData === null && otherRecordData !== null) ||
          (imRecordData && !imHasRecord && otherRecordData && otherHasRecord)
        ) {
          if (imRecordData) {
            // TODO check if we are retained in any async relationships
            // TODO probably need to release other things
            this.peekList[intendedIdentifier.type]?.delete(intendedIdentifier);
            // im.destroy();
          }
          imRecordData = otherRecordData!;
          // TODO do we need to notify the id change?
          // TODO swap recordIdentifierFor result?
          this.peekList[intendedIdentifier.type] = this.peekList[intendedIdentifier.type] || new Set();
          this.peekList[intendedIdentifier.type]!.add(intendedIdentifier);

          // just use im
        } else {
          // otherIm.destroy();
        }

        /*
      TODO @runspired consider adding this to make polymorphism even nicer
      if (HAS_RECORD_DATA_PACKAGE) {
        if (identifier.type !== matchedIdentifier.type) {
          const graphFor = importSync('@ember-data/record-data/-private').graphFor;
          graphFor(this).registerPolymorphicType(identifier.type, matchedIdentifier.type);
        }
      }
      */

        return intendedIdentifier;
      }
    );
  }
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'record' }): RecordInstance | undefined;
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'recordData' }): RecordData | undefined;
  peek({
    identifier,
    bucket,
  }: {
    identifier: StableRecordIdentifier;
    bucket: 'record' | 'recordData';
  }): RecordData | RecordInstance | undefined {
    return this.#instances[bucket]?.get(identifier);
  }

  getRecord(identifier: StableRecordIdentifier, properties?: CreateRecordProperties): RecordInstance {
    let record = this.peek({ identifier, bucket: 'record' });

    if (!record) {
      const recordData = this.getRecordData(identifier);
      const createOptions = recordData._initRecordCreateOptions(
        normalizeProperties(this.store, identifier, properties)
      );
      record = this.store.instantiateRecord(
        identifier,
        createOptions,
        this.__recordDataFor,
        this.store._notificationManager
      );
      setRecordIdentifier(record, identifier);
      setRecordDataFor(record, recordData);
      StoreMap.set(record, this.store);
      this.#instances.record.set(identifier, record);

      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: created Record for ${String(identifier)}`, properties);
      }
    }

    return record;
  }

  getRecordData(identifier: StableRecordIdentifier) {
    let recordData = this.peek({ identifier, bucket: 'recordData' });

    if (!recordData) {
      if (DEPRECATE_V1CACHE_STORE_APIS && this.store.createRecordDataFor.length > 2) {
        deprecate(
          `Store.createRecordDataFor(<type>, <id>, <lid>, <storeWrapper>) has been deprecated in favor of Store.createRecordDataFor(<identifier>, <storeWrapper>)`,
          false,
          {
            id: 'ember-data:deprecate-v1cache-store-apis',
            for: 'ember-data',
            until: '5.0',
            since: { enabled: '4.8', available: '4.8' },
          }
        );
        // @ts-expect-error
        recordData = this.store.createRecordDataFor(identifier.type, identifier.id, identifier.lid, this._storeWrapper);
      } else {
        recordData = this.store.createRecordDataFor(identifier, this._storeWrapper);
      }
      setRecordDataFor(identifier, recordData);
      // TODO this is invalid for v2 recordData but required
      // for v1 recordData. Remember to remove this once the
      // RecordData manager handles converting recordData to identifier
      setRecordIdentifier(recordData, identifier);

      this.#instances.recordData.set(identifier, recordData);
      this.peekList[identifier.type] = this.peekList[identifier.type] || new Set();
      this.peekList[identifier.type]!.add(identifier);
      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: created RecordData for ${String(identifier)}`);
      }
    }

    return recordData;
  }

  getReference(identifier: StableRecordIdentifier) {
    return this.#instances.reference.lookup(identifier);
  }

  createSnapshot(identifier: StableRecordIdentifier, options: FindOptions = {}): Snapshot {
    return new Snapshot(options, identifier, this.store);
  }

  disconnect(identifier: StableRecordIdentifier) {
    const record = this.#instances.record.get(identifier);
    assert(
      'Cannot destroy record while it is still materialized',
      !record || record.isDestroyed || record.isDestroying
    );

    if (HAS_RECORD_DATA_PACKAGE) {
      let graph = _peekGraph(this.store);
      if (graph) {
        graph.remove(identifier);
      }
    }

    this.store.identifierCache.forgetRecordIdentifier(identifier);
    if (LOG_INSTANCE_CACHE) {
      // eslint-disable-next-line no-console
      console.log(`InstanceCache: disconnected ${String(identifier)}`);
    }
  }

  unloadRecord(identifier: StableRecordIdentifier) {
    if (DEBUG) {
      const requests = this.store.getRequestStateService().getPendingRequestsForRecord(identifier);
      if (
        requests.some((req) => {
          return req.type === 'mutation';
        })
      ) {
        assert(`You can only unload a record which is not inFlight. '${String(identifier)}'`);
      }
    }
    if (LOG_INSTANCE_CACHE) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(`InstanceCache: unloading record for ${String(identifier)}`);
    }

    // TODO is this join still necessary?
    this.store._backburner.join(() => {
      const record = this.peek({ identifier, bucket: 'record' });
      const recordData = this.peek({ identifier, bucket: 'recordData' });
      this.peekList[identifier.type]?.delete(identifier);

      if (record) {
        this.store.teardownRecord(record);
        this.#instances.record.delete(identifier);
        StoreMap.delete(record);
        RecordCache.delete(record);
        removeRecordDataFor(record);

        if (LOG_INSTANCE_CACHE) {
          // eslint-disable-next-line no-console
          console.log(`InstanceCache: destroyed record for ${String(identifier)}`);
        }
      }

      if (recordData) {
        recordData.unloadRecord();
        this.#instances.recordData.delete(identifier);
        removeRecordDataFor(identifier);
        RecordCache.delete(recordData);
      } else {
        this.disconnect(identifier);
      }

      this.store._fetchManager.clearEntries(identifier);
      this.store.recordArrayManager.recordDidChange(identifier);
      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: unloaded RecordData for ${String(identifier)}`);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    });
  }

  clear(type?: string) {
    if (type === undefined) {
      let keys = Object.keys(this.peekList);
      keys.forEach((key) => this.clear(key));
    } else {
      let identifiers = this.peekList[type];
      if (identifiers) {
        identifiers.forEach((identifier) => {
          // TODO we rely on not removing the main cache
          // and only removing the peekList cache apparently.
          // we should figure out this duality and codify whatever
          // signal it is actually trying to give us.
          // this.cache.delete(identifier);
          this.peekList[identifier.type]!.delete(identifier);
          this.unloadRecord(identifier);
          // TODO we don't remove the identifier, should we?
        });
      }
    }
  }

  // TODO this should move into the network layer
  _fetchDataIfNeededForIdentifier(
    identifier: StableRecordIdentifier,
    options: FindOptions = {}
  ): Promise<StableRecordIdentifier> {
    // pre-loading will change the isEmpty value
    const isEmpty = _isEmpty(this, identifier);
    const isLoading = _isLoading(this, identifier);

    if (options.preload) {
      this.store._backburner.join(() => {
        preloadData(this.store, identifier, options.preload!);
      });
    }

    let promise: Promise<StableRecordIdentifier>;
    if (isEmpty) {
      assertIdentifierHasId(identifier);

      promise = this.store._fetchManager.scheduleFetch(identifier, options);
    } else if (isLoading) {
      promise = this.store._fetchManager.getPendingFetch(identifier, options)!;
      assert(`Expected to find a pending request for a record in the loading state, but found none`, promise);
    } else {
      promise = resolve(identifier);
    }

    return promise;
  }

  // TODO this should move into something coordinating operations
  setRecordId(identifier: StableRecordIdentifier, id: string) {
    const { type, lid } = identifier;
    let oldId = identifier.id;

    // ID absolutely can't be missing if the oldID is empty (missing Id in response for a new record)
    assert(
      `'${type}' was saved to the server, but the response does not have an id and your record does not either.`,
      !(id === null && oldId === null)
    );

    // ID absolutely can't be different than oldID if oldID is not null
    // TODO this assertion and restriction may not strictly be needed in the identifiers world
    assert(
      `Cannot update the id for '${type}:${lid}' from '${String(oldId)}' to '${id}'.`,
      !(oldId !== null && id !== oldId)
    );

    // ID can be null if oldID is not null (altered ID in response for a record)
    // however, this is more than likely a developer error.
    if (oldId !== null && id === null) {
      warn(
        `Your ${type} record was saved to the server, but the response does not have an id.`,
        !(oldId !== null && id === null)
      );
      return;
    }

    if (LOG_INSTANCE_CACHE) {
      // eslint-disable-next-line no-console
      console.log(`InstanceCache: updating id to '${id}' for record ${String(identifier)}`);
    }

    let existingIdentifier = this.store.identifierCache.peekRecordIdentifier({ type, id });
    assert(
      `'${type}' was saved to the server, but the response returned the new id '${id}', which has already been used with another record.'`,
      !existingIdentifier || existingIdentifier === identifier
    );

    if (identifier.id === null) {
      // TODO potentially this needs to handle merged result
      this.store.identifierCache.updateRecordIdentifier(identifier, { type, id });
    }

    // TODO update recordData if needed ?
    // TODO handle consequences of identifier merge for notifications
    this.store._notificationManager.notify(identifier, 'identity');
  }

  // TODO this should move into something coordinating operations
  loadData(data: ExistingResourceObject): StableExistingRecordIdentifier {
    let modelName = data.type;
    assert(
      `You must include an 'id' for ${modelName} in an object passed to 'push'`,
      data.id !== null && data.id !== undefined && data.id !== ''
    );
    assert(
      `You tried to push data with a type '${modelName}' but no model could be found with that name.`,
      this.store.getSchemaDefinitionService().doesTypeExist(modelName)
    );

    const resource = constructResource(normalizeModelName(data.type), ensureStringId(data.id), coerceId(data.lid));
    let identifier = this.store.identifierCache.peekRecordIdentifier(resource);
    let isUpdate = false;

    // store.push will be from empty
    // findRecord will be from root.loading
    // this cannot be loading state if we do not already have an identifier
    // all else will be updates
    if (identifier) {
      const isLoading = _isLoading(this, identifier) || !this.recordIsLoaded(identifier);
      isUpdate = !_isEmpty(this, identifier) && !isLoading;

      // exclude store.push (root.empty) case
      if (isUpdate || isLoading) {
        identifier = this.store.identifierCache.updateRecordIdentifier(identifier, data);
      }
    } else {
      identifier = this.store.identifierCache.getOrCreateRecordIdentifier(data);
    }

    const recordData = this.getRecordData(identifier);
    if (recordData.isNew()) {
      this.store._notificationManager.notify(identifier, 'identity');
    }

    const hasRecord = this.#instances.record.has(identifier);
    recordData.pushData(data, hasRecord);

    if (!isUpdate) {
      this.store.recordArrayManager.recordDidChange(identifier);
    }

    return identifier as StableExistingRecordIdentifier;
  }
}

function normalizeProperties(
  store: Store,
  identifier: StableRecordIdentifier,
  properties?: { [key: string]: unknown }
): { [key: string]: unknown } | undefined {
  // assert here
  if (properties !== undefined) {
    if ('id' in properties) {
      assert(`expected id to be a string or null`, properties.id !== undefined);
    }
    assert(
      `You passed '${typeof properties}' as properties for record creation instead of an object.`,
      typeof properties === 'object' && properties !== null
    );

    const { type } = identifier;

    // convert relationship Records to RecordDatas before passing to RecordData
    let defs = store.getSchemaDefinitionService().relationshipsDefinitionFor({ type });

    if (defs !== null) {
      let keys = Object.keys(properties);
      let relationshipValue;

      for (let i = 0; i < keys.length; i++) {
        let prop = keys[i];
        let def = defs[prop];

        if (def !== undefined) {
          if (def.kind === 'hasMany') {
            if (DEBUG) {
              assertRecordsPassedToHasMany(properties[prop] as RecordInstance[]);
            }
            relationshipValue = extractRecordDatasFromRecords(properties[prop] as RecordInstance[]);
          } else {
            relationshipValue = extractRecordDataFromRecord(properties[prop] as RecordInstance);
          }

          properties[prop] = relationshipValue;
        }
      }
    }
  }
  return properties;
}

function _recordDataIsFullDeleted(recordData: RecordData): boolean {
  return recordData.isDeletionCommitted() || (recordData.isNew() && recordData.isDeleted());
}

export function recordDataIsFullyDeleted(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  let recordData = cache.peek({ identifier, bucket: 'recordData' });
  return !recordData || _recordDataIsFullDeleted(recordData);
}

function assertRecordsPassedToHasMany(records: RecordInstance[]) {
  assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(records));
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed ${records
      .map((r) => `${typeof r}`)
      .join(', ')}`,
    (function () {
      return records.every((record) => {
        try {
          recordIdentifierFor(record);
          return true;
        } catch {
          return false;
        }
      });
    })()
  );
}

function extractRecordDatasFromRecords(records: RecordInstance[]): RecordData[] {
  return records.map(extractRecordDataFromRecord) as RecordData[];
}
type PromiseProxyRecord = { then(): void; content: RecordInstance | null | undefined };

function extractRecordDataFromRecord(recordOrPromiseRecord: PromiseProxyRecord | RecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (isPromiseRecord(recordOrPromiseRecord)) {
    let content = recordOrPromiseRecord.content;
    assert(
      'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.',
      content !== undefined
    );
    return content ? recordDataFor(content) : null;
  }

  return recordDataFor(recordOrPromiseRecord);
}

function isPromiseRecord(record: PromiseProxyRecord | RecordInstance): record is PromiseProxyRecord {
  return !!record.then;
}

/*
    When a find request is triggered on the store, the user can optionally pass in
    attributes and relationships to be preloaded. These are meant to behave as if they
    came back from the server, except the user obtained them out of band and is informing
    the store of their existence. The most common use case is for supporting client side
    nested URLs, such as `/posts/1/comments/2` so the user can do
    `store.findRecord('comment', 2, { preload: { post: 1 } })` without having to fetch the post.

    Preloaded data can be attributes and relationships passed in either as IDs or as actual
    models.
  */
type PreloadRelationshipValue = RecordInstance | string;
function preloadData(store: Store, identifier: StableRecordIdentifier, preload: Dict<unknown>) {
  let jsonPayload: JsonApiResource = {};
  //TODO(Igor) consider the polymorphic case
  const schemas = store.getSchemaDefinitionService();
  const relationships = schemas.relationshipsDefinitionFor(identifier);
  Object.keys(preload).forEach((key) => {
    let preloadValue = preload[key];

    let relationshipMeta = relationships[key];
    if (relationshipMeta) {
      if (!jsonPayload.relationships) {
        jsonPayload.relationships = {};
      }
      jsonPayload.relationships[key] = preloadRelationship(
        relationshipMeta,
        preloadValue as PreloadRelationshipValue | null | Array<PreloadRelationshipValue>
      );
    } else {
      if (!jsonPayload.attributes) {
        jsonPayload.attributes = {};
      }
      jsonPayload.attributes[key] = preloadValue;
    }
  });
  store._instanceCache.getRecordData(identifier).pushData(jsonPayload);
}

function preloadRelationship(
  schema: RelationshipSchema,
  preloadValue: PreloadRelationshipValue | null | Array<PreloadRelationshipValue>
): JsonApiRelationship {
  const relatedType = schema.type;

  if (schema.kind === 'hasMany') {
    assert('You need to pass in an array to set a hasMany property on a record', Array.isArray(preloadValue));
    return { data: preloadValue.map((value) => _convertPreloadRelationshipToJSON(value, relatedType)) };
  }

  assert('You should not pass in an array to set a belongsTo property on a record', !Array.isArray(preloadValue));
  return { data: preloadValue ? _convertPreloadRelationshipToJSON(preloadValue, relatedType) : null };
}

/*
  findRecord('user', '1', { preload: { friends: ['1'] }});
  findRecord('user', '1', { preload: { friends: [record] }});
*/
function _convertPreloadRelationshipToJSON(value: RecordInstance | string, type: string): ResourceIdentifierObject {
  if (typeof value === 'string' || typeof value === 'number') {
    return { type, id: value };
  }
  // TODO if not a record instance assert it's an identifier
  // and allow identifiers to be used
  return recordIdentifierFor(value);
}

function _isEmpty(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const recordData = cache.peek({ identifier: identifier, bucket: 'recordData' });
  if (!recordData) {
    return true;
  }
  const isNew = recordData.isNew();
  const isDeleted = recordData.isDeleted();
  const isEmpty = recordData.isEmpty?.() || false;

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
