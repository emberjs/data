import { assert, deprecate, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { importSync } from '@embroider/macros';
import { resolve } from 'rsvp';

import type { Graph } from '@ember-data/graph/-private/graph/graph';
import type { peekGraph } from '@ember-data/graph/-private/graph/index';
import { HAS_GRAPH_PACKAGE, HAS_JSON_API_PACKAGE } from '@ember-data/private-build-infra';
import { LOG_INSTANCE_CACHE } from '@ember-data/private-build-infra/debugging';
import { DEPRECATE_V1_RECORD_DATA, DEPRECATE_V1CACHE_STORE_APIS } from '@ember-data/private-build-infra/deprecations';
import type { Cache } from '@ember-data/types/q/cache';
import type { CacheStoreWrapper as StoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type {
  ExistingResourceIdentifierObject,
  ExistingResourceObject,
  NewResourceIdentifierObject,
} from '@ember-data/types/q/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import type { JsonApiRelationship, JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import type { RelationshipSchema } from '@ember-data/types/q/record-data-schemas';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import RecordReference from '../legacy-model-support/record-reference';
import { NonSingletonCacheManager, SingletonCacheManager } from '../managers/cache-manager';
import { CacheStoreWrapper } from '../managers/cache-store-wrapper';
import Snapshot from '../network/snapshot';
import type { CreateRecordProperties } from '../store-service';
import type Store from '../store-service';
import coerceId, { ensureStringId } from '../utils/coerce-id';
import constructResource from '../utils/construct-resource';
import { assertIdentifierHasId } from '../utils/identifier-has-id';
import normalizeModelName from '../utils/normalize-model-name';
import { removeRecordDataFor, setRecordDataFor } from './record-data-for';

let _peekGraph: peekGraph;
if (HAS_GRAPH_PACKAGE) {
  let __peekGraph: peekGraph;
  _peekGraph = (wrapper: Store | StoreWrapper): Graph | undefined => {
    let a = (importSync('@ember-data/graph/-private') as { peekGraph: peekGraph }).peekGraph;
    __peekGraph = __peekGraph || a;
    return __peekGraph(wrapper);
  };
}

/**
  @module @ember-data/store
*/

const RecordCache = new Map<RecordInstance, StableRecordIdentifier>();

export function peekRecordIdentifier(record: RecordInstance): StableRecordIdentifier | undefined {
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
export function recordIdentifierFor(record: RecordInstance): StableRecordIdentifier {
  assert(`${String(record)} is not a record instantiated by @ember-data/store`, RecordCache.has(record));
  return RecordCache.get(record)!;
}

export function setRecordIdentifier(record: RecordInstance, identifier: StableRecordIdentifier): void {
  if (DEBUG) {
    if (RecordCache.has(record) && RecordCache.get(record) !== identifier) {
      throw new Error(`${String(record)} was already assigned an identifier`);
    }
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

export const StoreMap = new Map<RecordInstance, Store>();

export function storeFor(record: RecordInstance): Store | undefined {
  const store = StoreMap.get(record);

  assert(
    `A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.`,
    store
  );
  return store;
}

type Caches = {
  record: Map<StableRecordIdentifier, RecordInstance>;
  recordData: Map<StableRecordIdentifier, Cache>;
  reference: WeakMap<StableRecordIdentifier, RecordReference>;
};

export class InstanceCache {
  declare store: Store;
  declare _storeWrapper: CacheStoreWrapper;
  declare __recordDataFor: (resource: RecordIdentifier) => Cache;

  declare __cacheManager: NonSingletonCacheManager;
  __instances: Caches = {
    record: new Map<StableRecordIdentifier, RecordInstance>(),
    recordData: new Map<StableRecordIdentifier, Cache>(),
    reference: new WeakMap<StableRecordIdentifier, RecordReference>(),
  };

  constructor(store: Store) {
    this.store = store;

    this._storeWrapper = new CacheStoreWrapper(this.store);
    this.__recordDataFor = (resource: RecordIdentifier) => {
      // TODO enforce strict
      const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource);
      return this.getRecordData(identifier);
    };

    store.identifierCache.__configureMerge(
      (identifier: StableRecordIdentifier, matchedIdentifier: StableRecordIdentifier, resourceData) => {
        let keptIdentifier = identifier;
        if (identifier.id !== matchedIdentifier.id) {
          keptIdentifier = 'id' in resourceData && identifier.id === resourceData.id ? identifier : matchedIdentifier;
        } else if (identifier.type !== matchedIdentifier.type) {
          keptIdentifier =
            'type' in resourceData && identifier.type === resourceData.type ? identifier : matchedIdentifier;
        }
        let staleIdentifier = identifier === keptIdentifier ? matchedIdentifier : identifier;

        // check for duplicate entities
        let keptHasRecord = this.__instances.record.has(keptIdentifier);
        let staleHasRecord = this.__instances.record.has(staleIdentifier);
        let keptRecordData = this.__instances.recordData.get(keptIdentifier) || null;
        let staleRecordData = this.__instances.recordData.get(staleIdentifier) || null;

        // we cannot merge entities when both have records
        // (this may not be strictly true, we could probably swap the recordData the record points at)
        if (keptHasRecord && staleHasRecord) {
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

          assert(
            `Failed to update the RecordIdentifier '${identifier.type}:${String(identifier.id)} (${
              identifier.lid
            })' to merge with the detected duplicate identifier '${matchedIdentifier.type}:${String(
              matchedIdentifier.id
            )} (${String(matchedIdentifier.lid)})'`
          );
        }

        let recordData = keptRecordData || staleRecordData;

        if (recordData) {
          recordData.sync({
            op: 'mergeIdentifiers',
            record: staleIdentifier,
            value: keptIdentifier,
          });
        } else if (HAS_JSON_API_PACKAGE) {
          // TODO notify cache always, this requires it always being a singleton
          // and not ever specific to one record-data
          this.store.__private_singleton_recordData?.sync({
            op: 'mergeIdentifiers',
            record: staleIdentifier,
            value: keptIdentifier,
          });
        }

        if (staleRecordData === null) {
          return keptIdentifier;
        }

        /*
      TODO @runspired consider adding this to make polymorphism even nicer
      if (HAS_GRAPH_PACKAGE) {
        if (identifier.type !== matchedIdentifier.type) {
          const graphFor = importSync('@ember-data/graph/-private').graphFor;
          graphFor(this).registerPolymorphicType(identifier.type, matchedIdentifier.type);
        }
      }
      */

        this.unloadRecord(staleIdentifier);
        return keptIdentifier;
      }
    );
  }
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'record' }): RecordInstance | undefined;
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'recordData' }): Cache | undefined;
  peek({
    identifier,
    bucket,
  }: {
    identifier: StableRecordIdentifier;
    bucket: 'record' | 'recordData';
  }): Cache | RecordInstance | undefined {
    return this.__instances[bucket]?.get(identifier);
  }

  getRecord(identifier: StableRecordIdentifier, properties?: CreateRecordProperties): RecordInstance {
    let record = this.__instances.record.get(identifier);

    if (!record) {
      const recordData = this.getRecordData(identifier);

      record = this.store.instantiateRecord(
        identifier,
        properties || {},
        this.__recordDataFor,
        this.store.notifications
      );
      setRecordIdentifier(record, identifier);
      setRecordDataFor(record, recordData);
      StoreMap.set(record, this.store);
      this.__instances.record.set(identifier, record);

      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: created Record for ${String(identifier)}`, properties);
      }
    }

    return record;
  }

  getRecordData(identifier: StableRecordIdentifier): Cache {
    let recordData = this.__instances.recordData.get(identifier);

    if (DEPRECATE_V1CACHE_STORE_APIS) {
      if (!recordData && this.store.createRecordDataFor.length > 2) {
        deprecate(
          `Store.createRecordDataFor(<type>, <id>, <lid>, <storeWrapper>) has been deprecated in favor of Store.createRecordDataFor(<identifier>, <storeWrapper>)`,
          false,
          {
            id: 'ember-data:deprecate-v1cache-store-apis',
            for: 'ember-data',
            until: '5.0',
            since: { enabled: '4.7', available: '4.7' },
          }
        );
        let recordDataInstance = this.store.createRecordDataFor(
          identifier.type,
          identifier.id,
          // @ts-expect-error
          identifier.lid,
          this._storeWrapper
        );
        if (DEPRECATE_V1_RECORD_DATA) {
          recordData = new NonSingletonCacheManager(this.store, recordDataInstance, identifier);
        } else {
          recordData = this.__cacheManager =
            this.__cacheManager || new NonSingletonCacheManager(this.store, recordDataInstance, identifier);
        }
      }
    }

    if (!recordData) {
      let recordDataInstance = this.store.createRecordDataFor(identifier, this._storeWrapper);
      if (DEPRECATE_V1_RECORD_DATA) {
        recordData = new NonSingletonCacheManager(this.store, recordDataInstance, identifier);
      } else {
        if (DEBUG) {
          recordData = this.__cacheManager = this.__cacheManager || new SingletonCacheManager();
          (recordData as SingletonCacheManager)._addRecordData(identifier, recordDataInstance as Cache);
        } else {
          recordData = recordDataInstance as Cache;
        }
      }

      setRecordDataFor(identifier, recordData);

      this.__instances.recordData.set(identifier, recordData);
      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: created RecordData for ${String(identifier)}`);
      }
    }

    return recordData;
  }

  getReference(identifier: StableRecordIdentifier) {
    let cache = this.__instances.reference;
    let reference = cache.get(identifier);

    if (!reference) {
      reference = new RecordReference(this.store, identifier);
      cache.set(identifier, reference);
    }
    return reference;
  }

  recordIsLoaded(identifier: StableRecordIdentifier, filterDeleted: boolean = false) {
    const recordData = this.__instances.recordData.get(identifier);
    if (!recordData) {
      return false;
    }
    const isNew = recordData.isNew(identifier);
    const isEmpty = recordData.isEmpty(identifier);

    // if we are new we must consider ourselves loaded
    if (isNew) {
      return !recordData.isDeleted(identifier);
    }
    // even if we have a past request, if we are now empty we are not loaded
    // typically this is true after an unloadRecord call

    // if we are not empty, not new && we have a fulfilled request then we are loaded
    // we should consider allowing for something to be loaded that is simply "not empty".
    // which is how RecordState currently handles this case; however, RecordState is buggy
    // in that it does not account for unloading.
    return filterDeleted && recordData.isDeletionCommitted(identifier) ? false : !isEmpty;

    /*
    const req = this.store.getRequestStateService();
    const fulfilled = req.getLastRequestForRecord(identifier);
    const isLocallyLoaded = !isEmpty;
    const isLoading =
      !isLocallyLoaded &&
      fulfilled === null &&
      req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query');

    if (isEmpty || (filterDeleted && recordData.isDeletionCommitted(identifier)) || isLoading) {
      return false;
    }

    return true;
    */
  }

  createSnapshot(identifier: StableRecordIdentifier, options: FindOptions = {}): Snapshot {
    return new Snapshot(options, identifier, this.store);
  }

  disconnect(identifier: StableRecordIdentifier) {
    const record = this.__instances.record.get(identifier);
    assert(
      'Cannot destroy record while it is still materialized',
      !record || record.isDestroyed || record.isDestroying
    );

    if (HAS_GRAPH_PACKAGE) {
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
    this.store._join(() => {
      const record = this.__instances.record.get(identifier);
      const recordData = this.__instances.recordData.get(identifier);

      if (record) {
        this.store.teardownRecord(record);
        this.__instances.record.delete(identifier);
        StoreMap.delete(record);
        RecordCache.delete(record);
        removeRecordDataFor(record);

        if (LOG_INSTANCE_CACHE) {
          // eslint-disable-next-line no-console
          console.log(`InstanceCache: destroyed record for ${String(identifier)}`);
        }
      }

      let removeFromRecordArray = true;
      if (recordData) {
        removeFromRecordArray = !recordData.isDeletionCommitted(identifier);
        recordData.unloadRecord(identifier);
        this.__instances.recordData.delete(identifier);
        removeRecordDataFor(identifier);
      } else {
        removeFromRecordArray = false;
        this.disconnect(identifier);
      }

      this.store._fetchManager.clearEntries(identifier);
      if (removeFromRecordArray) {
        this.store.recordArrayManager.identifierRemoved(identifier);
      }
      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: unloaded RecordData for ${String(identifier)}`);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    });
  }

  clear(type?: string) {
    const typeCache = this.store.identifierCache._cache.types;
    if (type === undefined) {
      this.__instances.recordData.forEach((value, identifier) => {
        this.unloadRecord(identifier);
      });
    } else {
      let identifiers = typeCache[type]?.lid;
      const rds = this.__instances.recordData;
      if (identifiers) {
        identifiers.forEach((identifier) => {
          if (rds.has(identifier)) {
            this.unloadRecord(identifier);
          }
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
    this.store.notifications.notify(identifier, 'identity');
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
    if (recordData.isNew(identifier)) {
      this.store.notifications.notify(identifier, 'identity');
    }

    const hasRecord = this.__instances.record.has(identifier);
    recordData.pushData(identifier, data, hasRecord);

    if (!isUpdate) {
      this.store.recordArrayManager.identifierAdded(identifier);
    }

    return identifier as StableExistingRecordIdentifier;
  }
}

function _recordDataIsFullDeleted(identifier: StableRecordIdentifier, recordData: Cache): boolean {
  return (
    recordData.isDeletionCommitted(identifier) || (recordData.isNew(identifier) && recordData.isDeleted(identifier))
  );
}

export function recordDataIsFullyDeleted(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  let recordData = cache.__instances.recordData.get(identifier);
  return !recordData || _recordDataIsFullDeleted(identifier, recordData);
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
export function preloadData(store: Store, identifier: StableRecordIdentifier, preload: Dict<unknown>) {
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
  store._instanceCache.getRecordData(identifier).pushData(identifier, jsonPayload);
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
function _convertPreloadRelationshipToJSON(
  value: RecordInstance | string,
  type: string
): ExistingResourceIdentifierObject | NewResourceIdentifierObject {
  if (typeof value === 'string' || typeof value === 'number') {
    return { type, id: value };
  }
  // TODO if not a record instance assert it's an identifier
  // and allow identifiers to be used
  return recordIdentifierFor(value);
}

function _isEmpty(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const recordData = cache.__instances.recordData.get(identifier);
  if (!recordData) {
    return true;
  }
  const isNew = recordData.isNew(identifier);
  const isDeleted = recordData.isDeleted(identifier);
  const isEmpty = recordData.isEmpty(identifier);

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
