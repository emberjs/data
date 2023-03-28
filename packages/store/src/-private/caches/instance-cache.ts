import { assert, deprecate, warn } from '@ember/debug';

import { importSync } from '@embroider/macros';

import { DEBUG } from '@ember-data/env';
import type { Graph } from '@ember-data/graph/-private/graph/graph';
import type { peekGraph } from '@ember-data/graph/-private/graph/index';
import { HAS_GRAPH_PACKAGE, HAS_JSON_API_PACKAGE } from '@ember-data/private-build-infra';
import { LOG_INSTANCE_CACHE } from '@ember-data/private-build-infra/debugging';
import {
  DEPRECATE_CREATE_RECORD_DATA_FOR_HOOK,
  DEPRECATE_INSTANTIATE_RECORD_ARGS,
  DEPRECATE_V1_RECORD_DATA,
  DEPRECATE_V1CACHE_STORE_APIS,
} from '@ember-data/private-build-infra/current-deprecations';
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
import type { Dict } from '@ember-data/types/q/utils';

import RecordReference from '../legacy-model-support/record-reference';
import { NonSingletonCacheManager } from '../managers/cache-manager';
import { CacheStoreWrapper } from '../managers/cache-store-wrapper';
import type { CreateRecordProperties } from '../store-service';
import type Store from '../store-service';
import coerceId, { ensureStringId } from '../utils/coerce-id';
import constructResource from '../utils/construct-resource';
import normalizeModelName from '../utils/normalize-model-name';
import { CacheForIdentifierCache, removeRecordDataFor, setCacheFor } from './cache-utils';

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
  resourceCache: Map<StableRecordIdentifier, Cache>;
  reference: WeakMap<StableRecordIdentifier, RecordReference>;
};

export class InstanceCache {
  declare store: Store;
  declare cache: Cache;
  declare _storeWrapper: CacheStoreWrapper;
  declare __cacheFor: (resource: RecordIdentifier) => Cache;

  declare __cacheManager: NonSingletonCacheManager;
  __instances: Caches = {
    record: new Map<StableRecordIdentifier, RecordInstance>(),
    resourceCache: new Map<StableRecordIdentifier, Cache>(),
    reference: new WeakMap<StableRecordIdentifier, RecordReference>(),
  };

  constructor(store: Store) {
    this.store = store;

    this._storeWrapper = new CacheStoreWrapper(this.store);

    if (DEPRECATE_CREATE_RECORD_DATA_FOR_HOOK) {
      this.__cacheFor = (resource: RecordIdentifier) => {
        // TODO enforce strict
        const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource);
        return this.getResourceCache(identifier);
      };
    }

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
        let keptResourceCache = this.__instances.resourceCache.get(keptIdentifier) || null;
        let staleResourceCache = this.__instances.resourceCache.get(staleIdentifier) || null;

        // we cannot merge entities when both have records
        // (this may not be strictly true, we could probably swap the cache data the record points at)
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

        let resourceCache = keptResourceCache || staleResourceCache;

        if (resourceCache) {
          resourceCache.patch({
            op: 'mergeIdentifiers',
            record: staleIdentifier,
            value: keptIdentifier,
          });
        } else if (!DEPRECATE_CREATE_RECORD_DATA_FOR_HOOK) {
          this.store.cache.patch({
            op: 'mergeIdentifiers',
            record: staleIdentifier,
            value: keptIdentifier,
          });
        } else if (HAS_JSON_API_PACKAGE) {
          this.store.cache.patch({
            op: 'mergeIdentifiers',
            record: staleIdentifier,
            value: keptIdentifier,
          });
        }

        if (staleResourceCache === null) {
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
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'resourceCache' }): Cache | undefined;
  peek({
    identifier,
    bucket,
  }: {
    identifier: StableRecordIdentifier;
    bucket: 'record' | 'resourceCache';
  }): Cache | RecordInstance | undefined {
    return this.__instances[bucket]?.get(identifier);
  }

  getRecord(identifier: StableRecordIdentifier, properties?: CreateRecordProperties): RecordInstance {
    let record = this.__instances.record.get(identifier);

    if (!record) {
      assert(
        `Cannot create a new record instance while the store is being destroyed`,
        !this.store.isDestroying && !this.store.isDestroyed
      );
      const cache = this.getResourceCache(identifier);

      if (DEPRECATE_INSTANTIATE_RECORD_ARGS) {
        if (this.store.instantiateRecord.length > 2) {
          deprecate(
            `Expected store.instantiateRecord to have an arity of 2. recordDataFor and notificationManager args have been deprecated.`,
            false,
            {
              for: '@ember-data/store',
              id: 'ember-data:deprecate-instantiate-record-args',
              since: { available: '4.12', enabled: '4.12' },
              until: '5.0',
            }
          );
        }
        record = this.store.instantiateRecord(
          identifier,
          properties || {},
          // @ts-expect-error
          this.__cacheFor,
          this.store.notifications
        );
      } else {
        record = this.store.instantiateRecord(identifier, properties || {});
      }

      setRecordIdentifier(record, identifier);
      setCacheFor(record, cache);
      StoreMap.set(record, this.store);
      this.__instances.record.set(identifier, record);

      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: created Record for ${String(identifier)}`, properties);
      }
    }

    return record;
  }

  getResourceCache(identifier: StableRecordIdentifier): Cache {
    if (!DEPRECATE_V1_RECORD_DATA) {
      const cache = this.store.cache;
      setCacheFor(identifier, cache);

      this.__instances.resourceCache.set(identifier, cache);
      return cache;
    }

    let cache = this.__instances.resourceCache.get(identifier);

    if (cache) {
      return cache;
    }

    if (this.store.createRecordDataFor) {
      deprecate(
        `Store.createRecordDataFor(<type>, <id>, <lid>, <storeWrapper>) has been deprecated in favor of Store.createCache(<storeWrapper>)`,
        false,
        {
          id: 'ember-data:deprecate-v1-cache',
          for: 'ember-data',
          until: '5.0',
          since: { enabled: '4.12', available: '4.12' },
        }
      );

      if (DEPRECATE_V1CACHE_STORE_APIS) {
        if (this.store.createRecordDataFor.length > 2) {
          let cacheInstance = this.store.createRecordDataFor(
            identifier.type,
            identifier.id,
            // @ts-expect-error
            identifier.lid,
            this._storeWrapper
          );
          cache = new NonSingletonCacheManager(this.store, cacheInstance, identifier);
        }
      }

      if (!cache) {
        let cacheInstance = this.store.createRecordDataFor(identifier, this._storeWrapper);

        cache =
          cacheInstance.version === '2'
            ? cacheInstance
            : new NonSingletonCacheManager(this.store, cacheInstance, identifier);
      }
    } else {
      cache = this.store.cache;
    }

    setCacheFor(identifier, cache);

    this.__instances.resourceCache.set(identifier, cache);
    if (LOG_INSTANCE_CACHE) {
      // eslint-disable-next-line no-console
      console.log(`InstanceCache: created Cache for ${String(identifier)}`);
    }

    return cache;
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
    const cache = DEPRECATE_V1_RECORD_DATA ? this.__instances.resourceCache.get(identifier) : this.cache;
    if (!cache) {
      return false;
    }
    const isNew = cache.isNew(identifier);
    const isEmpty = cache.isEmpty(identifier);

    // if we are new we must consider ourselves loaded
    if (isNew) {
      return !cache.isDeleted(identifier);
    }
    // even if we have a past request, if we are now empty we are not loaded
    // typically this is true after an unloadRecord call

    // if we are not empty, not new && we have a fulfilled request then we are loaded
    // we should consider allowing for something to be loaded that is simply "not empty".
    // which is how RecordState currently handles this case; however, RecordState is buggy
    // in that it does not account for unloading.
    return filterDeleted && cache.isDeletionCommitted(identifier) ? false : !isEmpty;
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
    this.__instances.resourceCache.delete(identifier);
    removeRecordDataFor(identifier);
    this.store._requestCache._clearEntries(identifier);
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
      const cache = DEPRECATE_V1_RECORD_DATA ? this.__instances.resourceCache.get(identifier) : this.cache;

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

      if (cache) {
        cache.unloadRecord(identifier);
        this.__instances.resourceCache.delete(identifier);
        removeRecordDataFor(identifier);
        if (LOG_INSTANCE_CACHE) {
          // eslint-disable-next-line no-console
          console.log(`InstanceCache: destroyed cache for ${String(identifier)}`);
        }
      } else {
        this.disconnect(identifier);
      }

      this.store._requestCache._clearEntries(identifier);
      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`InstanceCache: unloaded RecordData for ${String(identifier)}`);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    });
  }

  clear(type?: string) {
    const cache = this.store.identifierCache._cache;
    if (type === undefined) {
      // it would be cool if we could just de-ref cache here
      // but probably would require WeakRef models to do so.
      cache.lids.forEach((identifier) => {
        this.unloadRecord(identifier);
      });
    } else {
      const typeCache = cache.types;
      let identifiers = typeCache[type]?.lid;
      // const rds = this.__instances.resourceCache;
      if (identifiers) {
        identifiers.forEach((identifier) => {
          // if (rds.has(identifier)) {
          this.unloadRecord(identifier);
          // }
          // TODO we don't remove the identifier, should we?
        });
      }
    }
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

    // TODO update resource cache if needed ?
    // TODO handle consequences of identifier merge for notifications
    this.store.notifications.notify(identifier, 'identity');
  }

  // TODO ths should be wrapped in a deprecation flag since cache.put
  // handles this the rest of the time
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

    const cache = this.getResourceCache(identifier);
    const hasRecord = this.__instances.record.has(identifier);
    cache.upsert(identifier, data, hasRecord);

    return identifier as StableExistingRecordIdentifier;
  }
}

function _resourceIsFullDeleted(identifier: StableRecordIdentifier, cache: Cache): boolean {
  return cache.isDeletionCommitted(identifier) || (cache.isNew(identifier) && cache.isDeleted(identifier));
}

export function resourceIsFullyDeleted(instanceCache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const cache = DEPRECATE_V1_RECORD_DATA
    ? instanceCache.__instances.resourceCache.get(identifier)
    : instanceCache.cache;
  return !cache || _resourceIsFullDeleted(identifier, cache);
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
  const cache = DEPRECATE_V1_RECORD_DATA ? store._instanceCache.getResourceCache(identifier) : store.cache;
  const hasRecord = Boolean(store._instanceCache.peek({ identifier, bucket: 'record' }));
  cache.upsert(identifier, jsonPayload, hasRecord);
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

export function _clearCaches() {
  RecordCache.clear();
  StoreMap.clear();
  CacheForIdentifierCache.clear();
}
