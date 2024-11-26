import { warn } from '@ember/debug';

import { LOG_INSTANCE_CACHE } from '@warp-drive/build-config/debugging';
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { Cache } from '@warp-drive/core-types/cache';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { TypedRecordInstance, TypeFromInstance, TypeFromInstanceOrString } from '@warp-drive/core-types/record';
import type { LegacyRelationshipSchema as RelationshipSchema } from '@warp-drive/core-types/schema/fields';
import type {
  ExistingResourceIdentifierObject,
  ExistingResourceObject,
  InnerRelationshipDocument,
} from '@warp-drive/core-types/spec/json-api-raw';

import type { OpaqueRecordInstance } from '../../-types/q/record-instance';
import { CacheForIdentifierCache, removeRecordDataFor, setCacheFor } from '../caches/cache-utils';
import RecordReference from '../legacy-model-support/record-reference';
import type { CreateRecordProperties, Store } from '../store-service';
import { ensureStringId } from '../utils/coerce-id';
import { CacheCapabilitiesManager } from './cache-capabilities-manager';
import type { CacheManager } from './cache-manager';

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

const RecordCache = getOrSetGlobal('RecordCache', new Map<OpaqueRecordInstance, StableRecordIdentifier>());

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

export const StoreMap = getOrSetGlobal('StoreMap', new Map<OpaqueRecordInstance, Store>());

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

/**
 * ## ResourceManager
 *
 * The ResourceManager is responsible for managing instance
 * creation and retention for managed ui Objects.
 *
 * Managed UI Objects include:
 * - (Reactive) UIDocuments
 * - (Reactive) UIArrays
 * - (Reactive) UIRecords
 *
 * Every Managed UI Object has a well-known identity token:
 * - UIDocuments => StableDocumentIdentifier
 * - UIArrays => StableDocumentIdentifier
 * - UIRecords => StableRecordIdentifier
 *
 * This identity token is a CacheKey that can be safely used
 * to reference the UI Object and retrieve its associated data
 * from the Cache without needing to retain the UI Object itself.
 *
 * Data in the cache keyed to these CacheKeys includes:
 * - StableDocumentIdentifier => StructuredDocument (the request response)
 * - StableDocumentIdentifier => ResourceDocument (the parsed and processed content of the request)
 * - StableRecordIdentifier => Resource (the data for individual records)
 * - StableRecordIdentifier => GraphEdge (data describing the relationship between one resource and another)
 *
 * The ResourceManager has three modes:
 * - Strong (default - until v6)
 * - Weak + auto GC
 * - Weak + manual GC (defaut after v6)
 *
 *
 * ----------------------------------------------------------------
 *
 * ### Strong Mode
 *
 * In strong mode, Managed UI Objects are retained forever unless
 * explicitly destroyed by the application. Associated data in the
 * cache is similarly retained forever unless explicitly removed.
 *
 * Strong mode comes with inherent risks:
 * - memory usage may grow to a problematic size
 * - manually managing release can result in unsafe teardown occurring
 * - access to legacy APIs (only allowed in strong mode) like
 *   unloadRecord and unloadAll can result in application bugs,
 *   unsafe teardown, and broken relationships.
 *
 * While there are risks, strong mode is a great choice for applications
 * that understand these risks and are able to manage them effectively.
 *
 * Applications that may wish to use strong mode will typically be
 * those that utilize small quantities of data that changes infrequently.
 *
 * The primary benefit of strong mode is that it incurs less overhead
 * on accessing data because UI Objects do not need to ever re-instantiate,
 * and their instance is quicker to retrieve due to not requiring a
 * `<WeakRef>.deref()` resolution.
 *
 *
 * ----------------------------------------------------------------
 *
 * ### Weak Mode
 *
 * This is managed via WeakRef. In a WeakRef, the *value* is weakly
 * retained while the *key* is strongly retained. This means that
 * our CacheKey is strongly retained, but the UI Object is free to
 * be collected if the application no longer has a reference to it.
 *
 * On it's own, this already provides a significant reduction in
 * longterm memory usage for applications that have a lot of UI Objects:
 * but we can do more!
 *
 * In addition to utlizing WeakRefs, the ResourceManager manages a
 * a FinalizationRegistry and registers the Managed UI Object with it.
 *
 * This allows us to be notified when a UI Object is GC'd and either
 * update bookkeeping or perform a more advanced GC operation of our
 * own. Whenever a UI Object is GC'd, we mark it's CacheKey for potential
 * cleanup.
 *
 * This is where the Auto vs Manual GC comes into the picture.
 *
 * - Auto GC: The ResourceManager performs a GC operation using the
 *    FinalizationRegistry callback as a trigger to schedule the GC.
 * - Manual GC: The ResourceManager only used the FinalizationRegistry
 *    callback to update bookkeeping and relies on the application to
 *    trigger the GC operation.
 *
 * Which is best primarily depends on what framework you are using,
 * how well you understand your application's scheduling needs and workload,
 * and how much control you want to have over the GC process. Currently,
 * we think that leaving this decision to the application is the best choice,
 * at least until we've had more time to observe how and when applications
 * are using the GC in the wild and gathered feedback.
 *
 * > [!TIP]
 * > A manual GC operation is always possible when using auto GC, but it
 * > is almost non-sensical to call the GC manually as there would likely be no
 * > work to do.
 *
 *
 * ----------------------------------------------------------------
 *
 * ### Understanding the GC Process
 *
 * The GC Presumes that the application has fully migrated to using Request based
 * patterns and eliminated the use of all legacy resource-centric patterns.
 *
 * This presumption is necessary because the legacy resource-centric patterns are
 * not compatible with the concept of GC, because it is not possible to determine
 * when a resource in a relationship is no longer needed by the application except
 * for the few cases where it is part of a group of resources that are collectively
 * no longer accessible at all.
 *
 * We use a [Tracing GC approach](https://en.wikipedia.org/wiki/Tracing_garbage_collection)
 * but with a twist: reachability refers to the request graph, not the relationship graph.
 *
 * There are effectively two separate graph traversals possible of data in the WarpDrive Cache:
 * - the graph of which requests include which resources
 * - the graph of relationships between resources
 *
 * In our GC, we ignore the relationship graph and focus on the request graph, treating the
 * ResourceDocuments as the roots. If the CacheKey for a ResourceDocument has been marked,
 * and no other ResourceDocument can reach that document via a relationship of a resource it
 * contains directly, then it can be GC'd.
 *
 * We ignore the relationship graph specifically because every cache insertion is an upsert
 * operation on resources.  Over time lots of resources become reachable from each other in
 * the cache that were not originally reachable from each other in the request graph. While
 * this is useful efficient storage and retrieval and mutation management, it makes it mostly
 * useless for GC purposes. We care not about what is "physically" reachable from a resource
 *  but what is "conceptually" reachable from the application's perspective, trusting what the
 * application has previously told us via the request graph.
 *
 * Resources are a bit trickier because there's a few edge cases we have to keep in mind:
 * - A resource may have been created on the client and thus not yet be part of any document
 *   except within the mutated state of a relationship.
 * - A resource may have been added to the state of a relationship on a record within a document
 *   it was not originally part of.
 * - A resource may have been added to the cache but never materialized into a UIRecord.
 *
 * This third nuance is the most interesting because it means that quite easily we could end up
 * with orphaned state in the cache if all we rely on is the mark from the FinalizationRegistry
 * to generate the list of candidates for GC. For this reason, we always consider any resource
 * that was never materialized into a UIRecord as a candidate for GC and initialize its state as
 * marked.
 *
 * With the above in mind, we iterate the list of marked CacheKeys for resources: if the resource
 * no longer belongs to any known request, we consider it a candidate.
 *
 * - if the candidate is not in any relationships, we remove it from the cache
 * - if the candidate is only in implicit relationships, we remove it from the cache
 * - if the candidate is in a relationship with a non-candidate due to a mutation, we keep it and
 *   ensure it is added to that document's list of resources. We also add it to a temporary "kept" list.
 * - if the candidate is only in relationships with other candidates, it continues be a candidate.
 *
 * Once we have iterated all candidates, if no records were kept, then we can remove all remaining
 * candidates. If records were kept, we do another pass. Kept records become "non-candidates".
 *
 * - if the candidate is in a relationship with a kept record, and the document the kept record
 *   was added to has other resources of the same type, we keep the candidate and ensure it is added
 *   to that document's list of resources. We also add it to a new "kept" list.
 * - if the candidate is only in relationships with other candidates, it continues to be a candidate.
 *
 * We repeat the above process until no new records are kept in a pass, at which point we can remove
 * all remaining candidates.
 *
 * This process may occassionally result in keeping more records than the application actually needed
 * us to keep; however, it also ensures that we do not remove records that the application still needs
 * and provides a way to ensure that those records are still capable of being GC'd in the future.
 *
 * @internal
 */
export class ResourceManager {
  declare store: Store;
  declare cache: Cache;
  declare _storeWrapper: CacheCapabilitiesManager;

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
        console.log(`ResourceManager: created Record for ${String(identifier)}`, properties);
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
      console.log(`ResourceManager: disconnected ${String(identifier)}`);
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
      console.groupCollapsed(`ResourceManager: unloading record for ${String(identifier)}`);
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
          console.log(`ResourceManager: destroyed record for ${String(identifier)}`);
        }
      }

      if (cache) {
        cache.unloadRecord(identifier);
        removeRecordDataFor(identifier);
        if (LOG_INSTANCE_CACHE) {
          // eslint-disable-next-line no-console
          console.log(`ResourceManager: destroyed cache for ${String(identifier)}`);
        }
      } else {
        this.disconnect(identifier);
      }

      this.store._requestCache._clearEntries(identifier);
      if (LOG_INSTANCE_CACHE) {
        // eslint-disable-next-line no-console
        console.log(`ResourceManager: unloaded RecordData for ${String(identifier)}`);
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
      console.log(`ResourceManager: updating id to '${id}' for record ${String(identifier)}`);
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

export function resourceIsFullyDeleted(instanceCache: ResourceManager, identifier: StableRecordIdentifier): boolean {
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
  const jsonPayload: Partial<ExistingResourceObject> = {};
  //TODO(Igor) consider the polymorphic case
  const schemas = store.schema;
  const fields = schemas.fields(identifier);
  Object.keys(preload).forEach((key) => {
    const preloadValue = preload[key];

    const field = fields.get(key);
    if (field && (field.kind === 'hasMany' || field.kind === 'belongsTo')) {
      if (!jsonPayload.relationships) {
        jsonPayload.relationships = {};
      }
      jsonPayload.relationships[key] = preloadRelationship(field, preloadValue);
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
): InnerRelationshipDocument<ExistingResourceIdentifierObject> {
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
): ExistingResourceIdentifierObject {
  if (typeof value === 'string' || typeof value === 'number') {
    return { type, id: ensureStringId(value) };
  }
  // TODO if not a record instance assert it's an identifier
  // and allow identifiers to be used
  return recordIdentifierFor(value) as ExistingResourceIdentifierObject;
}

export function _clearCaches() {
  RecordCache.clear();
  StoreMap.clear();
  CacheForIdentifierCache.clear();
}
