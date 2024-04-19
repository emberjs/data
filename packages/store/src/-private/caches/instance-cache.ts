import { assert, warn } from '@ember/debug';

import { LOG_INSTANCE_CACHE } from '@warp-drive/build-config/debugging';
import { DEBUG } from '@warp-drive/build-config/env';
import type { RecordIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { TypedRecordInstance, TypeFromInstance, TypeFromInstanceOrString } from '@warp-drive/core-types/record';
import type { RelationshipSchema } from '@warp-drive/core-types/schema';
import type { ExistingResourceIdentifierObject, NewResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';

import type { Cache } from '../../-types/q/cache';
import type { JsonApiRelationship, JsonApiResource } from '../../-types/q/record-data-json-api';
import type { OpaqueRecordInstance } from '../../-types/q/record-instance';
import RecordReference from '../legacy-model-support/record-reference';
import { CacheCapabilitiesManager } from '../managers/cache-capabilities-manager';
import type { CacheManager } from '../managers/cache-manager';
import type { CreateRecordProperties } from '../store-service';
import type Store from '../store-service';
import { ensureStringId } from '../utils/coerce-id';
import { CacheForIdentifierCache, removeRecordDataFor, setCacheFor } from './cache-utils';

type Destroyable = {
  isDestroyed: boolean;
  isDestroying: boolean;
  destroy(): void;
};

function isDestroyable(record: OpaqueRecordInstance): record is Destroyable {
  return Boolean(record && typeof record === 'object' && typeof (record as Destroyable).destroy === 'function');
}

/**
  @module @ember-data/store
*/

const RecordCache = new Map<OpaqueRecordInstance, StableRecordIdentifier>();

export function peekRecordIdentifier(record: OpaqueRecordInstance): StableRecordIdentifier | undefined {
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
  @return {StableRecordIdentifier}
 */
export function recordIdentifierFor<T extends TypedRecordInstance>(
  record: T
): StableRecordIdentifier<TypeFromInstance<T>>;
export function recordIdentifierFor(record: OpaqueRecordInstance): StableRecordIdentifier;
export function recordIdentifierFor<T>(record: T): StableRecordIdentifier<TypeFromInstanceOrString<T>> {
  assert(`${String(record)} is not a record instantiated by @ember-data/store`, RecordCache.has(record));
  return RecordCache.get(record)! as StableRecordIdentifier<TypeFromInstanceOrString<T>>;
}

export function setRecordIdentifier(record: OpaqueRecordInstance, identifier: StableRecordIdentifier): void {
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

export const StoreMap = new Map<OpaqueRecordInstance, Store>();

export function storeFor(record: OpaqueRecordInstance): Store | undefined {
  const store = StoreMap.get(record);

  assert(
    `A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.`,
    store
  );
  return store;
}

type Caches = {
  record: Map<StableRecordIdentifier, OpaqueRecordInstance>;
  reference: WeakMap<StableRecordIdentifier, RecordReference>;
};

export class InstanceCache {
  declare store: Store;
  declare cache: Cache;
  declare _storeWrapper: CacheCapabilitiesManager;
  declare __cacheFor: (resource: RecordIdentifier) => Cache;

  declare __cacheManager: CacheManager;
  __instances: Caches = {
    record: new Map<StableRecordIdentifier, OpaqueRecordInstance>(),
    reference: new WeakMap<StableRecordIdentifier, RecordReference>(),
  };

  constructor(store: Store) {
    this.store = store;

    this._storeWrapper = new CacheCapabilitiesManager(this.store);

    store.identifierCache.__configureMerge(
      (identifier: StableRecordIdentifier, matchedIdentifier: StableRecordIdentifier, resourceData: unknown) => {
        let keptIdentifier = identifier;
        if (identifier.id !== matchedIdentifier.id) {
          // @ts-expect-error TODO this needs to be fixed
          keptIdentifier = 'id' in resourceData && identifier.id === resourceData.id ? identifier : matchedIdentifier;
        } else if (identifier.type !== matchedIdentifier.type) {
          keptIdentifier = // @ts-expect-error TODO this needs to be fixed
            'type' in resourceData && identifier.type === resourceData.type ? identifier : matchedIdentifier;
        }
        const staleIdentifier = identifier === keptIdentifier ? matchedIdentifier : identifier;

        // check for duplicate entities
        const keptHasRecord = this.__instances.record.has(keptIdentifier);
        const staleHasRecord = this.__instances.record.has(staleIdentifier);

        // we cannot merge entities when both have records
        // (this may not be strictly true, we could probably swap the cache data the record points at)
        if (keptHasRecord && staleHasRecord) {
          // TODO we probably don't need to throw these errors anymore
          // we can probably just "swap" what data source the abandoned
          // record points at so long as
          // it itself is not retained by the store in any way.
          // @ts-expect-error TODO this needs to be fixed
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

        this.store.cache.patch({
          op: 'mergeIdentifiers',
          record: staleIdentifier,
          value: keptIdentifier,
        });

        /*
      TODO @runspired consider adding this to make polymorphism even nicer
      if (identifier.type !== matchedIdentifier.type) {
        this.store._graph?.registerPolymorphicType(identifier.type, matchedIdentifier.type);
      }
      */

        this.unloadRecord(staleIdentifier);
        return keptIdentifier;
      }
    );
  }
  peek(identifier: StableRecordIdentifier): Cache | OpaqueRecordInstance | undefined {
    return this.__instances.record.get(identifier);
  }

  getRecord(identifier: StableRecordIdentifier, properties?: CreateRecordProperties): OpaqueRecordInstance {
    let record = this.__instances.record.get(identifier);

    if (!record) {
      assert(
        `Cannot create a new record instance while the store is being destroyed`,
        !this.store.isDestroying && !this.store.isDestroyed
      );
      const cache = this.store.cache;
      setCacheFor(identifier, cache);

      record = this.store.instantiateRecord(identifier, properties || {});

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

  getReference(identifier: StableRecordIdentifier) {
    const cache = this.__instances.reference;
    let reference = cache.get(identifier);

    if (!reference) {
      reference = new RecordReference(this.store, identifier);
      cache.set(identifier, reference);
    }
    return reference;
  }

  recordIsLoaded(identifier: StableRecordIdentifier, filterDeleted = false) {
    const cache = this.cache;
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
      !isDestroyable(record) || record.isDestroyed || record.isDestroying
    );

    this.store._graph?.remove(identifier);

    this.store.identifierCache.forgetRecordIdentifier(identifier);
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
      const cache = this.cache;

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
      cache.resources.forEach((identifier) => {
        this.unloadRecord(identifier);
      });
    } else {
      const typeCache = cache.resourcesByType;
      const identifiers = typeCache[type]?.lid;
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
    const oldId = identifier.id;

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

    const existingIdentifier = this.store.identifierCache.peekRecordIdentifier({ type, id });
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
}

function _resourceIsFullDeleted(identifier: StableRecordIdentifier, cache: Cache): boolean {
  return cache.isDeletionCommitted(identifier) || (cache.isNew(identifier) && cache.isDeleted(identifier));
}

export function resourceIsFullyDeleted(instanceCache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const cache = instanceCache.cache;
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
type PreloadRelationshipValue = OpaqueRecordInstance | string;
export function preloadData(store: Store, identifier: StableRecordIdentifier, preload: Record<string, Value>) {
  const jsonPayload: JsonApiResource = {};
  //TODO(Igor) consider the polymorphic case
  const schemas = store.getSchemaDefinitionService();
  const relationships = schemas.relationshipsDefinitionFor(identifier);
  Object.keys(preload).forEach((key) => {
    const preloadValue = preload[key];

    const relationshipMeta = relationships[key];
    if (relationshipMeta) {
      if (!jsonPayload.relationships) {
        jsonPayload.relationships = {};
      }
      jsonPayload.relationships[key] = preloadRelationship(relationshipMeta, preloadValue);
    } else {
      if (!jsonPayload.attributes) {
        jsonPayload.attributes = {};
      }
      jsonPayload.attributes[key] = preloadValue;
    }
  });
  const cache = store.cache;
  const hasRecord = Boolean(store._instanceCache.peek(identifier));
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
  value: OpaqueRecordInstance | string,
  type: string
): ExistingResourceIdentifierObject | NewResourceIdentifierObject {
  if (typeof value === 'string' || typeof value === 'number') {
    return { type, id: ensureStringId(value) };
  }
  // TODO if not a record instance assert it's an identifier
  // and allow identifiers to be used
  return recordIdentifierFor(value);
}

export function _clearCaches() {
  RecordCache.clear();
  StoreMap.clear();
  CacheForIdentifierCache.clear();
}
