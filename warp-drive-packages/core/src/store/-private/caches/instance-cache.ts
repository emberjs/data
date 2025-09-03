import { warn } from '@ember/debug';

import { LOG_INSTANCE_CACHE } from '@warp-drive/core/build-config/debugging';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import { createReactiveDocument, type ReactiveDocument } from '../../../reactive/-private/document.ts';
import { _CHECKOUT, ReactiveResource } from '../../../reactive/-private/record.ts';
import { getOrSetGlobal } from '../../../types/-private.ts';
import type { Cache } from '../../../types/cache.ts';
import type { RequestKey, ResourceKey } from '../../../types/identifier.ts';
import type { TypedRecordInstance, TypeFromInstance, TypeFromInstanceOrString } from '../../../types/record.ts';
import type { ResourceSchema } from '../../../types/schema/fields.ts';
import type { OpaqueRecordInstance } from '../../-types/q/record-instance.ts';
import { log, logGroup } from '../debug/utils.ts';
import { CacheCapabilitiesManager } from '../managers/cache-capabilities-manager.ts';
import type { CacheManager } from '../managers/cache-manager.ts';
import type { CreateRecordProperties, Store } from '../store-service.ts';

type Destroyable = {
  isDestroyed: boolean;
  isDestroying: boolean;
  destroy(): void;
};

function isDestroyable(record: OpaqueRecordInstance): record is Destroyable {
  return Boolean(record && typeof record === 'object' && typeof (record as Destroyable).destroy === 'function');
}

const RecordCache = getOrSetGlobal('RecordCache', new Map<OpaqueRecordInstance, ResourceKey>());

export function peekRecordIdentifier(record: OpaqueRecordInstance): ResourceKey | undefined {
  return RecordCache.get(record);
}

/**
  Retrieves the unique referentially-stable {@link ResourceKey}
  assigned to the given record instance.

  ```js
  import { recordIdentifierFor } from "@ember-data/store";
  // ... gain access to a record, for instance with peekRecord or findRecord
  const record = store.peekRecord("user", "1");
  // get the identifier for the record (see docs for ResourceKey)
  const identifier = recordIdentifierFor(record);
  // access the identifier's properties.
  const { id, type, lid } = identifier;
  ```

  @public
  @param record a record instance previously obstained from the store.
 */
export function recordIdentifierFor<T extends TypedRecordInstance>(record: T): ResourceKey<TypeFromInstance<T>>;
export function recordIdentifierFor(record: OpaqueRecordInstance): ResourceKey;
export function recordIdentifierFor<T>(record: T): ResourceKey<TypeFromInstanceOrString<T>> {
  assert(`${String(record)} is not a record instantiated by @ember-data/store`, RecordCache.has(record));
  return RecordCache.get(record)! as ResourceKey<TypeFromInstanceOrString<T>>;
}

export function setRecordIdentifier(record: OpaqueRecordInstance, identifier: ResourceKey): void {
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
export function removeRecordIdentifier(record: OpaqueRecordInstance): void {
  if (DEBUG) {
    if (!RecordCache.has(record)) {
      throw new Error(`${String(record)} had no assigned identifier to remove`);
    }
  }
  RecordCache.delete(record);
}

export const StoreMap: Map<unknown, Store> = getOrSetGlobal('StoreMap', new Map<OpaqueRecordInstance, Store>());

/**
 * We may eventually make this public, but its likely better for this to be killed off
 * @private
 */
export function storeFor(record: OpaqueRecordInstance, ignoreMissing: boolean): Store | null {
  const store = StoreMap.get(record);

  assert(
    `A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.`,
    ignoreMissing || store
  );
  return store ?? null;
}

export type Caches = {
  record: Map<ResourceKey, OpaqueRecordInstance>;
  document: Map<RequestKey, ReactiveDocument<OpaqueRecordInstance | OpaqueRecordInstance[] | null | undefined>>;
};

export class InstanceCache {
  declare store: Store;
  declare cache: Cache;
  declare _storeWrapper: CacheCapabilitiesManager;

  declare __cacheManager: CacheManager;
  declare __instances: Caches;

  constructor(store: Store) {
    this.store = store;
    this.__instances = {
      record: new Map(),
      document: new Map(),
    };

    this._storeWrapper = new CacheCapabilitiesManager(this.store);

    store.cacheKeyManager.__configureMerge(
      (identifier: ResourceKey, matchedIdentifier: ResourceKey, resourceData: unknown) => {
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
              `Failed to update the 'id' for the ResourceKey '${identifier.type}:${String(identifier.id)} (${
                identifier.lid
              })' to '${String(resourceData.id)}', because that id is already in use by '${
                matchedIdentifier.type
              }:${String(matchedIdentifier.id)} (${matchedIdentifier.lid})'`
            );
          }

          assert(
            `Failed to update the ResourceKey '${identifier.type}:${String(identifier.id)} (${
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
  peek(identifier: ResourceKey): Cache | OpaqueRecordInstance | undefined {
    return this.__instances.record.get(identifier);
  }

  getDocument<T>(identifier: RequestKey): ReactiveDocument<T> {
    let doc = this.__instances.document.get(identifier);
    if (!doc) {
      doc = createReactiveDocument<T>(this.store, identifier, null);
      this.__instances.document.set(identifier, doc);
    }
    return doc as ReactiveDocument<T>;
  }

  getRecord(identifier: ResourceKey): OpaqueRecordInstance {
    let record = this.__instances.record.get(identifier);

    if (!record) {
      record = _createRecord(this, identifier, {});
    }

    return record;
  }

  recordIsLoaded(identifier: ResourceKey, filterDeleted = false): boolean {
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

  disconnect(identifier: ResourceKey): void {
    const record = this.__instances.record.get(identifier);
    assert(
      'Cannot destroy record while it is still materialized',
      !isDestroyable(record) || record.isDestroyed || record.isDestroying
    );

    this.store._graph?.remove(identifier);

    this.store.cacheKeyManager.forgetRecordIdentifier(identifier);
    StoreMap.delete(identifier);
    this.store._requestCache._clearEntries(identifier);
    if (LOG_INSTANCE_CACHE) {
      log('reactive-ui', '', identifier.type, identifier.lid, 'disconnected', '');
    }
  }

  unloadRecord(identifier: ResourceKey): void {
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
      unloadRecord(this, identifier);
    });
  }

  clear(type?: string): void {
    const cache = this.store.cacheKeyManager._cache;
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
  setRecordId(identifier: ResourceKey, id: string): void {
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

    const existingIdentifier = this.store.cacheKeyManager.peekRecordIdentifier({ type, id });
    assert(
      `'${type}' was saved to the server, but the response returned the new id '${id}', which has already been used with another record.'`,
      !existingIdentifier || existingIdentifier === identifier
    );

    if (identifier.id === null) {
      // TODO potentially this needs to handle merged result
      this.store.cacheKeyManager.updateRecordIdentifier(identifier, { type, id });
    }

    // TODO update resource cache if needed ?
    // TODO handle consequences of identifier merge for notifications
    this.store.notifications.notify(identifier, 'identity', null);
  }
}

export function getNewRecord(
  instances: InstanceCache,
  identifier: ResourceKey,
  properties: CreateRecordProperties
): OpaqueRecordInstance {
  let record = instances.__instances.record.get(identifier);

  if (!record) {
    record = _createRecord(instances, identifier, properties);

    if (record instanceof ReactiveResource && instances.store.schema.resource) {
      // this is a work around until we introduce a new async createRecord API
      const schema = instances.store.schema.resource(identifier) as ResourceSchema;
      if (!schema.legacy) {
        const editable = _CHECKOUT(record);
        if (properties) {
          Object.assign(editable, properties);
        }
        return editable;
      }
    }
  }

  return record;
}

function _createRecord(
  instances: InstanceCache,
  identifier: ResourceKey,
  properties: CreateRecordProperties
): OpaqueRecordInstance {
  assert(
    `Cannot create a new record instance while the store is being destroyed`,
    !instances.store.isDestroying && !instances.store.isDestroyed
  );

  const record = instances.store.instantiateRecord(identifier, properties);

  setRecordIdentifier(record, identifier);
  StoreMap.set(record, instances.store);
  instances.__instances.record.set(identifier, record);

  if (LOG_INSTANCE_CACHE) {
    logGroup('reactive-ui', '', identifier.type, identifier.lid, 'created', '');
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  return record;
}

export function _clearCaches(): void {
  RecordCache.clear();
  StoreMap.clear();
}

function unloadRecord(instances: InstanceCache, identifier: ResourceKey) {
  const record = instances.__instances.record.get(identifier);
  const cache = instances.cache;

  if (record) {
    instances.store.teardownRecord(record);
    instances.__instances.record.delete(identifier);
    StoreMap.delete(record);
    RecordCache.delete(record);

    if (LOG_INSTANCE_CACHE) {
      // eslint-disable-next-line no-console
      console.log(`InstanceCache: destroyed record for ${String(identifier)}`);
    }
  }

  if (cache) {
    cache.unloadRecord(identifier);
    StoreMap.delete(identifier);
    if (LOG_INSTANCE_CACHE) {
      // eslint-disable-next-line no-console
      console.log(`InstanceCache: destroyed cache for ${String(identifier)}`);
    }
  } else {
    instances.disconnect(identifier);
  }

  instances.store._requestCache._clearEntries(identifier);
  if (LOG_INSTANCE_CACHE) {
    // eslint-disable-next-line no-console
    console.log(`InstanceCache: unloaded RecordData for ${String(identifier)}`);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}
