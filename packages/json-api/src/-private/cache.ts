/**
 * @module @ember-data/json-api
 */
import { assert } from '@ember/debug';

import { graphFor, isBelongsTo, peekGraph } from '@ember-data/graph/-private';
import type { CollectionEdge } from '@ember-data/graph/-private/edges/collection';
import type { ImplicitEdge } from '@ember-data/graph/-private/edges/implicit';
import type { ResourceEdge } from '@ember-data/graph/-private/edges/resource';
import type { Graph, GraphEdge } from '@ember-data/graph/-private/graph';
import type Store from '@ember-data/store';
import type { IdentifierCache } from '@ember-data/store/-private/caches/identifier-cache';
import type { CacheCapabilitiesManager as InternalCapabilitiesManager } from '@ember-data/store/-private/managers/cache-capabilities-manager';
import type { MergeOperation } from '@ember-data/store/-types/q/cache';
import type { CacheCapabilitiesManager } from '@ember-data/store/-types/q/cache-store-wrapper';
import type { AttributesHash, JsonApiError, JsonApiResource } from '@ember-data/store/-types/q/record-data-json-api';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import { LOG_MUTATIONS, LOG_OPERATIONS, LOG_REQUESTS } from '@warp-drive/build-config/debugging';
import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import type { Cache, ChangedAttributesHash, RelationshipDiff } from '@warp-drive/core-types/cache';
import type { ResourceBlob } from '@warp-drive/core-types/cache/aliases';
import type { Change } from '@warp-drive/core-types/cache/change';
import type { CollectionRelationship, ResourceRelationship } from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type {
  StableDocumentIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@warp-drive/core-types/identifier';
import type { Value } from '@warp-drive/core-types/json/raw';
import type {
  ImmutableRequestInfo,
  StructuredDataDocument,
  StructuredDocument,
  StructuredErrorDocument,
} from '@warp-drive/core-types/request';
import type {
  CollectionResourceDataDocument,
  ResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
} from '@warp-drive/core-types/spec/document';
import type {
  CollectionResourceDocument,
  ExistingResourceObject,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@warp-drive/core-types/spec/raw';

function isImplicit(relationship: GraphEdge): relationship is ImplicitEdge {
  return relationship.definition.isImplicit;
}

function upgradeCapabilities(obj: unknown): asserts obj is InternalCapabilitiesManager {}

const EMPTY_ITERATOR = {
  iterator() {
    return {
      next() {
        return { done: true, value: undefined };
      },
    };
  },
};

interface CachedResource {
  id: string | null;
  remoteAttrs: Record<string, Value | undefined> | null;
  localAttrs: Record<string, Value | undefined> | null;
  inflightAttrs: Record<string, Value | undefined> | null;
  changes: Record<string, [Value | undefined, Value]> | null;
  errors: JsonApiError[] | null;
  isNew: boolean;
  isDeleted: boolean;
  isDeletionCommitted: boolean;

  /**
   * debugging only
   *
   * @internal
   */
  inflightRelationships?: Record<string, unknown> | null;
}

function makeCache(): CachedResource {
  return {
    id: null,
    remoteAttrs: null,
    localAttrs: null,
    inflightAttrs: null,
    changes: null,
    errors: null,
    isNew: false,
    isDeleted: false,
    isDeletionCommitted: false,
  };
}

/**
  A JSON:API Cache implementation.

  What cache the store uses is configurable. Using a different
  implementation can be achieved by implementing the store's
  createCache hook.

  This is the cache implementation used by `ember-data`.

  ```js
  import Cache from '@ember-data/json-api';
  import Store from '@ember-data/store';

  export default class extends Store {
    createCache(wrapper) {
      return new Cache(wrapper);
    }
  }
  ```

  @class Cache
  @public
 */

export default class JSONAPICache implements Cache {
  /**
   * The Cache Version that this implementation implements.
   *
   * @type {'2'}
   * @public
   * @property version
   */
  declare version: '2';
  declare _capabilities: CacheCapabilitiesManager;
  declare __cache: Map<StableRecordIdentifier, CachedResource>;
  declare __destroyedCache: Map<StableRecordIdentifier, CachedResource>;
  declare __documents: Map<string, StructuredDocument<ResourceDocument>>;
  declare __graph: Graph;

  constructor(storeWrapper: CacheCapabilitiesManager) {
    this.version = '2';
    this._capabilities = storeWrapper;
    this.__cache = new Map();
    this.__graph = graphFor(storeWrapper);
    this.__destroyedCache = new Map();
    this.__documents = new Map();
  }

  // Cache Management
  // ================

  /**
   * Cache the response to a request
   *
   * Implements `Cache.put`.
   *
   * Expects a StructuredDocument whose `content` member is a JsonApiDocument.
   *
   * ```js
   * cache.put({
   *   request: { url: 'https://api.example.com/v1/user/1' },
   *   content: {
   *     data: {
   *       type: 'user',
   *       id: '1',
   *       attributes: {
   *         name: 'Chris'
   *       }
   *     }
   *   }
   * })
   * ```
   *
   * > **Note**
   * > The nested `content` and `data` members are not a mistake. This is because
   * > there are two separate concepts involved here, the `StructuredDocument` which contains
   * > the context of a given Request that has been issued with the returned contents as its
   * > `content` property, and a `JSON:API Document` which is the json contents returned by
   * > this endpoint and which uses its `data` property to signify which resources are the
   * > primary resources associated with the request.
   *
   * StructuredDocument's with urls will be cached as full documents with
   * associated resource membership order and contents preserved but linked
   * into the cache.
   *
   * @method put
   * @param {StructuredDocument} doc
   * @return {ResourceDocument}
   * @public
   */
  put<T extends SingleResourceDocument>(doc: StructuredDocument<T>): SingleResourceDataDocument;
  put<T extends CollectionResourceDocument>(doc: StructuredDocument<T>): CollectionResourceDataDocument;
  put<T extends ResourceErrorDocument>(doc: StructuredErrorDocument<T>): ResourceErrorDocument;
  put<T extends ResourceMetaDocument>(doc: StructuredDataDocument<T>): ResourceMetaDocument;
  put(doc: StructuredDocument<ResourceDocument>): ResourceDocument {
    assert(
      `Expected a JSON:API Document as the content provided to the cache, received ${typeof doc.content}`,
      doc instanceof Error || (typeof doc.content === 'object' && doc.content !== null)
    );
    if (isErrorDocument(doc)) {
      return this._putDocument(doc, undefined, undefined);
    } else if (isMetaDocument(doc)) {
      return this._putDocument(doc, undefined, undefined);
    }

    const jsonApiDoc = doc.content as SingleResourceDocument | CollectionResourceDocument;
    const included = jsonApiDoc.included;
    let i: number, length: number;
    const { identifierCache } = this._capabilities;

    if (LOG_REQUESTS) {
      const Counts = new Map();
      if (included) {
        for (i = 0, length = included.length; i < length; i++) {
          const type = included[i].type;
          Counts.set(type, (Counts.get(type) || 0) + 1);
        }
      }
      if (Array.isArray(jsonApiDoc.data)) {
        for (i = 0, length = jsonApiDoc.data.length; i < length; i++) {
          const type = jsonApiDoc.data[i].type;
          Counts.set(type, (Counts.get(type) || 0) + 1);
        }
      } else if (jsonApiDoc.data) {
        const type = jsonApiDoc.data.type;
        Counts.set(type, (Counts.get(type) || 0) + 1);
      }

      let str = `JSON:API Cache - put (${doc.content?.lid || doc.request?.url || 'unknown-request'})\n\tContents:`;
      Counts.forEach((count, type) => {
        str += `\n\t\t${type}: ${count}`;
      });
      if (Counts.size === 0) {
        str += `\t(empty)`;
      }
      // eslint-disable-next-line no-console
      console.log(str);
    }

    if (included) {
      for (i = 0, length = included.length; i < length; i++) {
        included[i] = putOne(this, identifierCache, included[i]);
      }
    }

    if (Array.isArray(jsonApiDoc.data)) {
      length = jsonApiDoc.data.length;
      const identifiers: StableExistingRecordIdentifier[] = [];

      for (i = 0; i < length; i++) {
        identifiers.push(putOne(this, identifierCache, jsonApiDoc.data[i]));
      }
      return this._putDocument(
        doc as StructuredDataDocument<CollectionResourceDocument>,
        identifiers,
        included as StableExistingRecordIdentifier[]
      );
    }

    if (jsonApiDoc.data === null) {
      return this._putDocument(
        doc as StructuredDataDocument<SingleResourceDocument>,
        null,
        included as StableExistingRecordIdentifier[]
      );
    }

    assert(
      `Expected a resource object in the 'data' property in the document provided to the cache, but was ${typeof jsonApiDoc.data}`,
      typeof jsonApiDoc.data === 'object'
    );

    const identifier = putOne(this, identifierCache, jsonApiDoc.data);
    return this._putDocument(
      doc as StructuredDataDocument<SingleResourceDocument>,
      identifier,
      included as StableExistingRecordIdentifier[]
    );
  }

  _putDocument<T extends ResourceErrorDocument>(
    doc: StructuredErrorDocument<T>,
    data: undefined,
    included: undefined
  ): ResourceErrorDocument;
  _putDocument<T extends ResourceMetaDocument>(
    doc: StructuredDataDocument<T>,
    data: undefined,
    included: undefined
  ): ResourceMetaDocument;
  _putDocument<T extends SingleResourceDocument>(
    doc: StructuredDataDocument<T>,
    data: StableExistingRecordIdentifier | null,
    included: StableExistingRecordIdentifier[] | undefined
  ): SingleResourceDataDocument;
  _putDocument<T extends CollectionResourceDocument>(
    doc: StructuredDataDocument<T>,
    data: StableExistingRecordIdentifier[],
    included: StableExistingRecordIdentifier[] | undefined
  ): CollectionResourceDataDocument;
  _putDocument<T extends ResourceDocument>(
    doc: StructuredDocument<T>,
    data: StableExistingRecordIdentifier[] | StableExistingRecordIdentifier | null | undefined,
    included: StableExistingRecordIdentifier[] | undefined
  ): SingleResourceDataDocument | CollectionResourceDataDocument | ResourceErrorDocument | ResourceMetaDocument {
    // @ts-expect-error narrowing within is just horrible  in TS :/
    const resourceDocument: SingleResourceDataDocument | CollectionResourceDataDocument | ResourceErrorDocument =
      isErrorDocument(doc) ? fromStructuredError(doc) : fromBaseDocument(doc);

    if (data !== undefined) {
      (resourceDocument as ResourceDataDocument).data = data;
    }

    if (included !== undefined) {
      assert(`There should not be included data on an Error document`, !isErrorDocument(doc));
      assert(`There should not be included data on a Meta document`, !isMetaDocument(doc));
      (resourceDocument as ResourceDataDocument).included = included;
    }

    const request = doc.request as ImmutableRequestInfo | undefined;
    const identifier = request ? this._capabilities.identifierCache.getOrCreateDocumentIdentifier(request) : null;

    if (identifier) {
      resourceDocument.lid = identifier.lid;

      // @ts-expect-error
      doc.content = resourceDocument;
      const hasExisting = this.__documents.has(identifier.lid);
      this.__documents.set(identifier.lid, doc as StructuredDocument<ResourceDocument>);

      this._capabilities.notifyChange(identifier, hasExisting ? 'updated' : 'added');
    }

    return resourceDocument;
  }

  /**
   * Update the "remote" or "canonical" (persisted) state of the Cache
   * by merging new information into the existing state.
   *
   * Note: currently the only valid resource operation is a MergeOperation
   * which occurs when a collision of identifiers is detected.
   *
   * @method patch
   * @public
   * @param {Operation} op the operation to perform
   * @return {void}
   */
  patch(op: MergeOperation): void {
    if (LOG_OPERATIONS) {
      try {
        const _data = JSON.parse(JSON.stringify(op)) as object;
        // eslint-disable-next-line no-console
        console.log(`EmberData | Operation - patch ${op.op}`, _data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`EmberData | Operation - patch ${op.op}`, op);
      }
    }
    if (op.op === 'mergeIdentifiers') {
      const cache = this.__cache.get(op.record);
      if (cache) {
        this.__cache.set(op.value, cache);
        this.__cache.delete(op.record);
      }
      this.__graph.update(op, true);
    }
  }

  /**
   * Update the "local" or "current" (unpersisted) state of the Cache
   *
   * @method mutate
   * @param {Mutation} mutation
   * @return {void}
   * @public
   */
  mutate(mutation: LocalRelationshipOperation): void {
    if (LOG_MUTATIONS) {
      try {
        const _data = JSON.parse(JSON.stringify(mutation)) as object;
        // eslint-disable-next-line no-console
        console.log(`EmberData | Mutation - update ${mutation.op}`, _data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`EmberData | Mutation - update ${mutation.op}`, mutation);
      }
    }
    this.__graph.update(mutation, false);
  }

  /**
   * Peek resource data from the Cache.
   *
   * In development, if the return value
   * is JSON the return value
   * will be deep-cloned and deep-frozen
   * to prevent mutation thereby enforcing cache
   * Immutability.
   *
   * This form of peek is useful for implementations
   * that want to feed raw-data from cache to the UI
   * or which want to interact with a blob of data
   * directly from the presentation cache.
   *
   * An implementation might want to do this because
   * de-referencing records which read from their own
   * blob is generally safer because the record does
   * not require retainining connections to the Store
   * and Cache to present data on a per-field basis.
   *
   * This generally takes the place of `getAttr` as
   * an API and may even take the place of `getRelationship`
   * depending on implementation specifics, though this
   * latter usage is less recommended due to the advantages
   * of the Graph handling necessary entanglements and
   * notifications for relational data.
   *
   * @method peek
   * @public
   * @param {StableRecordIdentifier | StableDocumentIdentifier} identifier
   * @return {ResourceDocument | ResourceBlob | null} the known resource data
   */
  peek(identifier: StableRecordIdentifier): ResourceBlob | null;
  peek(identifier: StableDocumentIdentifier): ResourceDocument | null;
  peek(identifier: StableDocumentIdentifier | StableRecordIdentifier): ResourceBlob | ResourceDocument | null {
    if ('type' in identifier) {
      const peeked = this.__safePeek(identifier, false);

      if (!peeked) {
        return null;
      }

      const { type, id, lid } = identifier;
      const attributes = Object.assign({}, peeked.remoteAttrs, peeked.inflightAttrs, peeked.localAttrs);
      const relationships: JsonApiResource['relationships'] = {};

      const rels = this.__graph.identifiers.get(identifier);
      if (rels) {
        Object.keys(rels).forEach((key) => {
          const rel = rels[key];
          if (rel.definition.isImplicit) {
            return;
          } else {
            relationships[key] = this.__graph.getData(identifier, key);
          }
        });
      }

      upgradeCapabilities(this._capabilities);
      const store = this._capabilities._store;
      const attrs = this._capabilities.schema.fields(identifier);
      attrs.forEach((attr, key) => {
        if (key in attributes && attributes[key] !== undefined) {
          return;
        }
        const defaultValue = getDefaultValue(attr, identifier, store);

        if (defaultValue !== undefined) {
          attributes[key] = defaultValue;
        }
      });

      return {
        type,
        id,
        lid,
        attributes,
        relationships,
      };
    }

    const document = this.peekRequest(identifier);

    if (document) {
      if ('content' in document) return document.content;
    }
    return null;
  }

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request.
   *
   * This is effectively the reverse of `put` for a request in
   * that it will return the the request, response, and content
   * whereas `peek` will return just the `content`.
   *
   * @method peekRequest
   * @param {StableDocumentIdentifier}
   * @return {StructuredDocument<ResourceDocument> | null}
   * @public
   */
  peekRequest(identifier: StableDocumentIdentifier): StructuredDocument<ResourceDocument> | null {
    return this.__documents.get(identifier.lid) || null;
  }

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * @method upsert
   * @public
   * @param identifier
   * @param data
   * @param hasRecord
   * @return {void | string[]} if `hasRecord` is true then calculated key changes should be returned
   */
  upsert(
    identifier: StableRecordIdentifier,
    data: JsonApiResource,
    calculateChanges?: boolean | undefined
  ): void | string[] {
    let changedKeys: string[] | undefined;
    const peeked = this.__safePeek(identifier, false);
    const existed = !!peeked;
    const cached = peeked || this._createCache(identifier);

    const isLoading = /*#__NOINLINE__*/ _isLoading(peeked, this._capabilities, identifier) || !recordIsLoaded(peeked);
    const isUpdate = /*#__NOINLINE__*/ !_isEmpty(peeked) && !isLoading;

    if (LOG_OPERATIONS) {
      try {
        const _data = JSON.parse(JSON.stringify(data)) as object;
        // eslint-disable-next-line no-console
        console.log(`EmberData | Operation - upsert (${existed ? 'merge' : 'insert'})`, _data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`EmberData | Operation - upsert (${existed ? 'merge' : 'insert'})`, data);
      }
    }

    if (cached.isNew) {
      cached.isNew = false;
      this._capabilities.notifyChange(identifier, 'identity');
      this._capabilities.notifyChange(identifier, 'state');
    }

    if (calculateChanges) {
      changedKeys = existed ? calculateChangedKeys(cached, data.attributes) : Object.keys(data.attributes || {});
    }

    cached.remoteAttrs = Object.assign(
      cached.remoteAttrs || (Object.create(null) as Record<string, unknown>),
      data.attributes
    );
    if (cached.localAttrs) {
      if (patchLocalAttributes(cached)) {
        this._capabilities.notifyChange(identifier, 'state');
      }
    }

    if (!isUpdate) {
      this._capabilities.notifyChange(identifier, 'added');
    }

    if (data.id) {
      cached.id = data.id;
    }

    if (data.relationships) {
      setupRelationships(this.__graph, this._capabilities, identifier, data);
    }

    if (changedKeys && changedKeys.length) {
      notifyAttributes(this._capabilities, identifier, changedKeys);
    }

    return changedKeys;
  }

  // Cache Forking Support
  // =====================

  /**
   * Create a fork of the cache from the current state.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to fork at the Store level, which will
   * utilize this method to fork the cache.
   *
   * @method fork
   * @internal
   * @return Promise<Cache>
   */
  fork(): Promise<Cache> {
    throw new Error(`Not Implemented`);
  }

  /**
   * Merge a fork back into a parent Cache.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to merge at the Store level, which will
   * utilize this method to merge the caches.
   *
   * @method merge
   * @param {Cache} cache
   * @public
   * @return Promise<void>
   */
  merge(cache: Cache): Promise<void> {
    throw new Error(`Not Implemented`);
  }

  /**
   * Generate the list of changes applied to all
   * record in the store.
   *
   * Each individual resource or document that has
   * been mutated should be described as an individual
   * `Change` entry in the returned array.
   *
   * A `Change` is described by an object containing up to
   * three properties: (1) the `identifier` of the entity that
   * changed; (2) the `op` code of that change being one of
   * `upsert` or `remove`, and if the op is `upsert` a `patch`
   * containing the data to merge into the cache for the given
   * entity.
   *
   * This `patch` is opaque to the Store but should be understood
   * by the Cache and may expect to be utilized by an Adapter
   * when generating data during a `save` operation.
   *
   * It is generally recommended that the `patch` contain only
   * the updated state, ignoring fields that are unchanged
   *
   * ```ts
   * interface Change {
   *  identifier: StableRecordIdentifier | StableDocumentIdentifier;
   *  op: 'upsert' | 'remove';
   *  patch?: unknown;
   * }
   * ```
   *
   * @method diff
   * @public
   */
  diff(): Promise<Change[]> {
    throw new Error(`Not Implemented`);
  }

  // SSR Support
  // ===========

  /**
   * Serialize the entire contents of the Cache into a Stream
   * which may be fed back into a new instance of the same Cache
   * via `cache.hydrate`.
   *
   * @method dump
   * @return {Promise<ReadableStream>}
   * @public
   */
  dump(): Promise<ReadableStream<unknown>> {
    throw new Error(`Not Implemented`);
  }

  /**
   * hydrate a Cache from a Stream with content previously serialized
   * from another instance of the same Cache, resolving when hydration
   * is complete.
   *
   * This method should expect to be called both in the context of restoring
   * the Cache during application rehydration after SSR **AND** at unknown
   * times during the lifetime of an already booted application when it is
   * desired to bulk-load additional information into the cache. This latter
   * behavior supports optimizing pre/fetching of data for route transitions
   * via data-only SSR modes.
   *
   * @method hydrate
   * @param {ReadableStream} stream
   * @return {Promise<void>}
   * @public
   */
  hydrate(stream: ReadableStream<unknown>): Promise<void> {
    throw new Error('Not Implemented');
  }

  // Resource Support
  // ================

  /**
   * [LIFECYCLE] Signal to the cache that a new record has been instantiated on the client
   *
   * It returns properties from options that should be set on the record during the create
   * process. This return value behavior is deprecated.
   *
   * @method clientDidCreate
   * @public
   * @param identifier
   * @param createArgs
   */
  clientDidCreate(
    identifier: StableRecordIdentifier,
    options?: Record<string, Value> | undefined
  ): Record<string, unknown> {
    if (LOG_MUTATIONS) {
      try {
        const _data = options ? (JSON.parse(JSON.stringify(options)) as object) : options;
        // eslint-disable-next-line no-console
        console.log(`EmberData | Mutation - clientDidCreate ${identifier.lid}`, _data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`EmberData | Mutation - clientDidCreate ${identifier.lid}`, options);
      }
    }
    const cached = this._createCache(identifier);
    cached.isNew = true;
    const createOptions: Record<string, unknown> = {};

    if (options !== undefined) {
      const storeWrapper = this._capabilities;
      const fields = storeWrapper.schema.fields(identifier);
      const graph = this.__graph;
      const propertyNames = Object.keys(options);

      for (let i = 0; i < propertyNames.length; i++) {
        const name = propertyNames[i];
        const propertyValue = options[name];

        if (name === 'id') {
          continue;
        }

        const fieldType: FieldSchema | undefined = fields.get(name);
        const kind = fieldType !== undefined ? ('kind' in fieldType ? fieldType.kind : 'attribute') : null;
        let relationship: ResourceEdge | CollectionEdge;

        switch (kind) {
          case 'attribute':
            this.setAttr(identifier, name, propertyValue);
            createOptions[name] = propertyValue;
            break;
          case 'belongsTo':
            this.mutate({
              op: 'replaceRelatedRecord',
              field: name,
              record: identifier,
              value: propertyValue as StableRecordIdentifier | null,
            });
            relationship = graph.get(identifier, name) as ResourceEdge;
            relationship.state.hasReceivedData = true;
            relationship.state.isEmpty = false;
            break;
          case 'hasMany':
            this.mutate({
              op: 'replaceRelatedRecords',
              field: name,
              record: identifier,
              value: propertyValue as unknown as StableRecordIdentifier[],
            });
            relationship = graph.get(identifier, name) as CollectionEdge;
            relationship.state.hasReceivedData = true;
            relationship.state.isEmpty = false;
            break;
          default:
            // reflect back (pass-thru) unknown properties
            createOptions[name] = propertyValue;
        }
      }
    }

    this._capabilities.notifyChange(identifier, 'added');

    return createOptions;
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @method willCommit
   * @public
   * @param identifier
   */
  willCommit(identifier: StableRecordIdentifier): void {
    const cached = this.__peek(identifier, false);

    /*
      if we have multiple saves in flight at once then
      we have information loss no matter what. This
      attempts to lose the least information.

      If we were to clear inflightAttrs, previous requests
      would not be able to use it during their didCommit.

      If we upsert inflightattrs, previous requests incorrectly
      see more recent inflight changes as part of their own and
      will incorrectly mark the new state as the correct remote state.

      We choose this latter behavior to avoid accidentally removing
      earlier changes.

      If apps do not want this behavior they can either
      - chain save requests serially vs allowing concurrent saves
      - move to using a request handler that caches the inflight state
        on a per-request basis
      - change their save requests to only send a "PATCH" instead of a "PUT"
        so that only latest changes are involved in each request, and then also
        ensure that the API or their handler reflects only those changes back
        for upsert into the cache.
    */
    if (cached.inflightAttrs) {
      if (cached.localAttrs) {
        Object.assign(cached.inflightAttrs, cached.localAttrs);
      }
    } else {
      cached.inflightAttrs = cached.localAttrs;
    }
    cached.localAttrs = null;

    if (DEBUG) {
      if (!DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
        // save off info about saved relationships
        const relationships = this._capabilities.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
        Object.keys(relationships).forEach((relationshipName) => {
          const relationship = relationships[relationshipName];
          if (relationship.kind === 'belongsTo') {
            if (this.__graph._isDirty(identifier, relationshipName)) {
              const relationshipData = this.__graph.getData(identifier, relationshipName);
              const inFlight = (cached.inflightRelationships =
                cached.inflightRelationships || (Object.create(null) as Record<string, unknown>));
              inFlight[relationshipName] = relationshipData;
            }
          }
        });
      }
    }
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @method didCommit
   * @public
   * @param identifier
   * @param data
   */
  didCommit(
    committedIdentifier: StableRecordIdentifier,
    result: StructuredDataDocument<SingleResourceDocument>
  ): SingleResourceDataDocument {
    const payload = result.content;
    const operation = result.request.op;
    const data = payload && payload.data;

    if (!data) {
      assert(
        `Your ${committedIdentifier.type} record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response.`,
        committedIdentifier.id
      );
    }

    const { identifierCache } = this._capabilities;
    const existingId = committedIdentifier.id;
    const identifier: StableRecordIdentifier =
      operation !== 'deleteRecord' && data
        ? identifierCache.updateRecordIdentifier(committedIdentifier, data)
        : committedIdentifier;

    const cached = this.__peek(identifier, false);
    if (cached.isDeleted) {
      this.__graph.push({
        op: 'deleteRecord',
        record: identifier,
        isNew: false,
      });
      cached.isDeletionCommitted = true;
      this._capabilities.notifyChange(identifier, 'removed');
      // TODO @runspired should we early exit here?
    }

    if (DEBUG) {
      if (cached.isNew && !identifier.id && (typeof data?.id !== 'string' || data.id.length > 0)) {
        const error = new Error(`Expected an id ${String(identifier)} in response ${JSON.stringify(data)}`);
        //@ts-expect-error
        error.isAdapterError = true;
        //@ts-expect-error
        error.code = 'InvalidError';
        throw error;
      }
    }

    cached.isNew = false;
    let newCanonicalAttributes: AttributesHash | undefined;
    if (data) {
      if (data.id && !cached.id) {
        cached.id = data.id;
      }
      if (identifier === committedIdentifier && identifier.id !== existingId) {
        this._capabilities.notifyChange(identifier, 'identity');
      }

      assert(
        `Expected the ID received for the primary '${identifier.type}' resource being saved to match the current id '${cached.id}' but received '${identifier.id}'.`,
        identifier.id === cached.id
      );

      if (data.relationships) {
        if (DEBUG) {
          if (!DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
            // assert against bad API behavior where a belongsTo relationship
            // is saved but the return payload indicates a different final state.
            const relationships = this._capabilities
              .getSchemaDefinitionService()
              .relationshipsDefinitionFor(identifier);
            Object.keys(relationships).forEach((relationshipName) => {
              const relationship = relationships[relationshipName];
              if (relationship.kind === 'belongsTo') {
                const relationshipData = data.relationships![relationshipName]?.data;
                if (relationshipData !== undefined) {
                  const inFlightData = cached.inflightRelationships?.[relationshipName] as SingleResourceRelationship;
                  if (!inFlightData || !('data' in inFlightData)) {
                    return;
                  }
                  const actualData = relationshipData
                    ? this._capabilities.identifierCache.getOrCreateRecordIdentifier(relationshipData)
                    : null;
                  assert(
                    `Expected the resource relationship '<${identifier.type}>.${relationshipName}' on ${
                      identifier.lid
                    } to be saved as ${inFlightData.data ? inFlightData.data.lid : '<null>'} but it was saved as ${
                      actualData ? actualData.lid : '<null>'
                    }`,
                    inFlightData.data === actualData
                  );
                }
              }
            });
            cached.inflightRelationships = null;
          }
        }
        setupRelationships(this.__graph, this._capabilities, identifier, data);
      }
      newCanonicalAttributes = data.attributes;
    }
    const changedKeys = calculateChangedKeys(cached, newCanonicalAttributes);

    cached.remoteAttrs = Object.assign(
      cached.remoteAttrs || (Object.create(null) as Record<string, unknown>),
      cached.inflightAttrs,
      newCanonicalAttributes
    );
    cached.inflightAttrs = null;
    patchLocalAttributes(cached);

    if (cached.errors) {
      cached.errors = null;
      this._capabilities.notifyChange(identifier, 'errors');
    }

    notifyAttributes(this._capabilities, identifier, changedKeys);
    this._capabilities.notifyChange(identifier, 'state');

    const included = payload && payload.included;
    if (included) {
      for (let i = 0, length = included.length; i < length; i++) {
        putOne(this, identifierCache, included[i]);
      }
    }

    return {
      data: identifier as StableExistingRecordIdentifier,
    };
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @method commitWasRejected
   * @public
   * @param identifier
   * @param errors
   */
  commitWasRejected(identifier: StableRecordIdentifier, errors?: JsonApiError[] | undefined): void {
    const cached = this.__peek(identifier, false);
    if (cached.inflightAttrs) {
      const keys = Object.keys(cached.inflightAttrs);
      if (keys.length > 0) {
        const attrs = (cached.localAttrs =
          cached.localAttrs || (Object.create(null) as Record<string, Value | undefined>));
        for (let i = 0; i < keys.length; i++) {
          if (attrs[keys[i]] === undefined) {
            attrs[keys[i]] = cached.inflightAttrs[keys[i]];
          }
        }
      }
      cached.inflightAttrs = null;
    }
    if (errors) {
      cached.errors = errors;
    }
    this._capabilities.notifyChange(identifier, 'errors');
  }

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * This method is a candidate to become a mutation
   *
   * @method unloadRecord
   * @public
   * @param identifier
   */
  unloadRecord(identifier: StableRecordIdentifier): void {
    const storeWrapper = this._capabilities;
    // TODO this is necessary because
    // we maintain memebership inside InstanceCache
    // for peekAll, so even though we haven't created
    // any data we think this exists.
    // TODO can we eliminate that membership now?
    if (!this.__cache.has(identifier)) {
      // the graph may still need to unload identity
      peekGraph(storeWrapper)?.unload(identifier);
      return;
    }
    const removeFromRecordArray = !this.isDeletionCommitted(identifier);
    let removed = false;
    const cached = this.__peek(identifier, false);

    if (cached.isNew) {
      peekGraph(storeWrapper)?.push({
        op: 'deleteRecord',
        record: identifier,
        isNew: true,
      });
    } else {
      peekGraph(storeWrapper)?.unload(identifier);
    }

    // effectively clearing these is ensuring that
    // we report as `isEmpty` during teardown.
    cached.localAttrs = null;
    cached.remoteAttrs = null;
    cached.inflightAttrs = null;

    const relatedIdentifiers = _allRelatedIdentifiers(storeWrapper, identifier);
    if (areAllModelsUnloaded(storeWrapper, relatedIdentifiers)) {
      for (let i = 0; i < relatedIdentifiers.length; ++i) {
        const relatedIdentifier = relatedIdentifiers[i];
        storeWrapper.notifyChange(relatedIdentifier, 'removed');
        removed = true;
        storeWrapper.disconnectRecord(relatedIdentifier);
      }
    }

    this.__cache.delete(identifier);
    this.__destroyedCache.set(identifier, cached);

    /*
     * The destroy cache is a hack to prevent applications
     * from blowing up during teardown. Accessing state
     * on a destroyed record is not safe, but historically
     * was possible due to a combination of teardown timing
     * and retention of cached state directly on the
     * record itself.
     *
     * Once we have deprecated accessing state on a destroyed
     * instance we may remove this. The timing isn't a huge deal
     * as momentarily retaining the objects outside the bounds
     * of a test won't cause issues.
     */
    if (this.__destroyedCache.size === 1) {
      // TODO do we still need this?
      setTimeout(() => {
        this.__destroyedCache.clear();
      }, 100);
    }

    if (!removed && removeFromRecordArray) {
      storeWrapper.notifyChange(identifier, 'removed');
    }
  }

  // Granular Resource Data APIs
  // ===========================

  /**
   * Retrieve the data for an attribute from the cache
   *
   * @method getAttr
   * @public
   * @param identifier
   * @param field
   * @return {unknown}
   */
  getAttr(identifier: StableRecordIdentifier, attr: string): Value | undefined {
    const cached = this.__peek(identifier, true);
    if (cached.localAttrs && attr in cached.localAttrs) {
      return cached.localAttrs[attr];
    } else if (cached.inflightAttrs && attr in cached.inflightAttrs) {
      return cached.inflightAttrs[attr];
    } else if (cached.remoteAttrs && attr in cached.remoteAttrs) {
      return cached.remoteAttrs[attr];
    } else {
      const attrSchema = this._capabilities.schema.fields(identifier).get(attr);

      upgradeCapabilities(this._capabilities);
      return getDefaultValue(attrSchema, identifier, this._capabilities._store);
    }
  }

  /**
   * Mutate the data for an attribute in the cache
   *
   * This method is a candidate to become a mutation
   *
   * @method setAttr
   * @public
   * @param identifier
   * @param field
   * @param value
   */
  setAttr(identifier: StableRecordIdentifier, attr: string, value: Value): void {
    const cached = this.__peek(identifier, false);
    const existing =
      cached.inflightAttrs && attr in cached.inflightAttrs
        ? cached.inflightAttrs[attr]
        : cached.remoteAttrs && attr in cached.remoteAttrs
          ? cached.remoteAttrs[attr]
          : undefined;
    if (existing !== value) {
      cached.localAttrs = cached.localAttrs || (Object.create(null) as Record<string, Value>);
      cached.localAttrs[attr] = value;
      cached.changes = cached.changes || (Object.create(null) as Record<string, [Value, Value]>);
      cached.changes[attr] = [existing, value];
    } else if (cached.localAttrs) {
      delete cached.localAttrs[attr];
      delete cached.changes![attr];
    }

    this._capabilities.notifyChange(identifier, 'attributes', attr);
  }

  /**
   * Query the cache for the changed attributes of a resource.
   *
   * @method changedAttrs
   * @public
   * @param identifier
   * @return {ChangedAttributesHash} { <field>: [<old>, <new>] }
   */
  changedAttrs(identifier: StableRecordIdentifier): ChangedAttributesHash {
    // TODO freeze in dev
    return this.__peek(identifier, false).changes || (Object.create(null) as ChangedAttributesHash);
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @method hasChangedAttrs
   * @public
   * @param identifier
   * @return {boolean}
   */
  hasChangedAttrs(identifier: StableRecordIdentifier): boolean {
    const cached = this.__peek(identifier, true);

    return (
      (cached.inflightAttrs !== null && Object.keys(cached.inflightAttrs).length > 0) ||
      (cached.localAttrs !== null && Object.keys(cached.localAttrs).length > 0)
    );
  }

  /**
   * Tell the cache to discard any uncommitted mutations to attributes
   *
   * This method is a candidate to become a mutation
   *
   * @method rollbackAttrs
   * @public
   * @param identifier
   * @return {string[]} the names of fields that were restored
   */
  rollbackAttrs(identifier: StableRecordIdentifier): string[] {
    const cached = this.__peek(identifier, false);
    let dirtyKeys: string[] | undefined;
    cached.isDeleted = false;

    if (cached.localAttrs !== null) {
      dirtyKeys = Object.keys(cached.localAttrs);
      cached.localAttrs = null;
      cached.changes = null;
    }

    if (cached.isNew) {
      // > Note: Graph removal handled by unloadRecord
      cached.isDeletionCommitted = true;
      cached.isDeleted = true;
      cached.isNew = false;
    }

    cached.inflightAttrs = null;

    if (cached.errors) {
      cached.errors = null;
      this._capabilities.notifyChange(identifier, 'errors');
    }

    this._capabilities.notifyChange(identifier, 'state');

    if (dirtyKeys && dirtyKeys.length) {
      notifyAttributes(this._capabilities, identifier, dirtyKeys);
    }

    return dirtyKeys || [];
  }

  /**
     * Query the cache for the changes to relationships of a resource.
     *
     * Returns a map of relationship names to RelationshipDiff objects.
     *
     * ```ts
     * type RelationshipDiff =
    | {
        kind: 'collection';
        remoteState: StableRecordIdentifier[];
        additions: Set<StableRecordIdentifier>;
        removals: Set<StableRecordIdentifier>;
        localState: StableRecordIdentifier[];
        reordered: boolean;
      }
    | {
        kind: 'resource';
        remoteState: StableRecordIdentifier | null;
        localState: StableRecordIdentifier | null;
      };
      ```
     *
     * @method changedRelationships
     * @public
     * @param {StableRecordIdentifier} identifier
     * @return {Map<string, RelationshipDiff>}
     */
  changedRelationships(identifier: StableRecordIdentifier): Map<string, RelationshipDiff> {
    return this.__graph.getChanged(identifier);
  }

  /**
   * Query the cache for whether any mutated relationships exist
   *
   * @method hasChangedRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @return {boolean}
   */
  hasChangedRelationships(identifier: StableRecordIdentifier): boolean {
    return this.__graph.hasChanged(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to relationships.
   *
   * This will also discard the change on any appropriate inverses.
   *
   * This method is a candidate to become a mutation
   *
   * @method rollbackRelationships
   * @public
   * @param {StableRecordIdentifier} identifier
   * @return {string[]} the names of relationships that were restored
   */
  rollbackRelationships(identifier: StableRecordIdentifier): string[] {
    upgradeCapabilities(this._capabilities);
    let result!: string[];
    this._capabilities._store._join(() => {
      result = this.__graph.rollback(identifier);
    });
    return result;
  }

  /**
   * Query the cache for the current state of a relationship property
   *
   * @method getRelationship
   * @public
   * @param identifier
   * @param field
   * @return resource relationship object
   */
  getRelationship(identifier: StableRecordIdentifier, field: string): ResourceRelationship | CollectionRelationship {
    return this.__graph.getData(identifier, field);
  }

  // Resource State
  // ===============

  /**
   * Update the cache state for the given resource to be marked
   * as locally deleted, or remove such a mark.
   *
   * This method is a candidate to become a mutation
   *
   * @method setIsDeleted
   * @public
   * @param identifier
   * @param isDeleted {boolean}
   */
  setIsDeleted(identifier: StableRecordIdentifier, isDeleted: boolean): void {
    const cached = this.__peek(identifier, false);
    cached.isDeleted = isDeleted;
    // > Note: Graph removal for isNew handled by unloadRecord
    this._capabilities.notifyChange(identifier, 'state');
  }

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @method getErrors
   * @public
   * @param identifier
   * @return {JsonApiError[]}
   */
  getErrors(identifier: StableRecordIdentifier): JsonApiError[] {
    return this.__peek(identifier, true).errors || [];
  }

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @method isEmpty
   * @public
   * @param identifier
   * @return {boolean}
   */
  isEmpty(identifier: StableRecordIdentifier): boolean {
    const cached = this.__safePeek(identifier, true);
    return cached ? cached.remoteAttrs === null && cached.inflightAttrs === null && cached.localAttrs === null : true;
  }

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @method isNew
   * @public
   * @param identifier
   * @return {boolean}
   */
  isNew(identifier: StableRecordIdentifier): boolean {
    // TODO can we assert here?
    return this.__safePeek(identifier, true)?.isNew || false;
  }

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @method isDeleted
   * @public
   * @param identifier
   * @return {boolean}
   */
  isDeleted(identifier: StableRecordIdentifier): boolean {
    // TODO can we assert here?
    return this.__safePeek(identifier, true)?.isDeleted || false;
  }

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @method isDeletionCommitted
   * @public
   * @param identifier
   * @return {boolean}
   */
  isDeletionCommitted(identifier: StableRecordIdentifier): boolean {
    // TODO can we assert here?
    return this.__safePeek(identifier, true)?.isDeletionCommitted || false;
  }

  /**
   * Private method used to populate an entry for the identifier
   *
   * @method _createCache
   * @internal
   * @param {StableRecordIdentifier} identifier
   * @return {CachedResource}
   */
  _createCache(identifier: StableRecordIdentifier): CachedResource {
    assert(`Expected no resource data to yet exist in the cache`, !this.__cache.has(identifier));
    const cache = makeCache();
    this.__cache.set(identifier, cache);
    return cache;
  }

  /**
   * Peek whether we have cached resource data matching the identifier
   * without asserting if the resource data is missing.
   *
   * @method __safePeek
   * @param {StableRecordIdentifier} identifier
   * @param {Boolean} allowDestroyed
   * @internal
   * @return {CachedResource | undefined}
   */
  __safePeek(identifier: StableRecordIdentifier, allowDestroyed: boolean): CachedResource | undefined {
    let resource = this.__cache.get(identifier);
    if (!resource && allowDestroyed) {
      resource = this.__destroyedCache.get(identifier);
    }
    return resource;
  }

  /**
   * Peek whether we have cached resource data matching the identifier
   * Asserts if the resource data is missing.
   *
   * @method __Peek
   * @param {StableRecordIdentifier} identifier
   * @param {Boolean} allowDestroyed
   * @internal
   * @return {CachedResource}
   */
  __peek(identifier: StableRecordIdentifier, allowDestroyed: boolean): CachedResource {
    const resource = this.__safePeek(identifier, allowDestroyed);
    assert(
      `Expected Cache to have a resource entry for the identifier ${String(identifier)} but none was found`,
      resource
    );
    return resource;
  }
}

function areAllModelsUnloaded(wrapper: CacheCapabilitiesManager, identifiers: StableRecordIdentifier[]): boolean {
  for (let i = 0; i < identifiers.length; ++i) {
    const identifier = identifiers[i];
    if (wrapper.hasRecord(identifier)) {
      return false;
    }
  }
  return true;
}

function getLocalState(rel: CollectionEdge | ResourceEdge): StableRecordIdentifier[] {
  if (isBelongsTo(rel)) {
    return rel.localState ? [rel.localState] : [];
  }
  return rel.additions ? [...rel.additions] : [];
}

function getRemoteState(rel: CollectionEdge | ResourceEdge) {
  if (isBelongsTo(rel)) {
    return rel.remoteState ? [rel.remoteState] : [];
  }
  return rel.remoteState;
}

function getDefaultValue(
  schema: FieldSchema | undefined,
  identifier: StableRecordIdentifier,
  store: Store
): Value | undefined {
  const options = schema?.options;

  if (!schema || (!options && !schema.type)) {
    return;
  }

  if (schema.kind !== 'attribute' && schema.kind !== 'field') {
    return;
  }

  // legacy support for defaultValues that are functions
  if (typeof options?.defaultValue === 'function') {
    // If anyone opens an issue for args not working right, we'll restore + deprecate it via a Proxy
    // that lazily instantiates the record. We don't want to provide any args here
    // because in a non @ember-data/model world they don't make sense.
    return options.defaultValue() as Value;
    // legacy support for defaultValues that are primitives
  } else if (options && 'defaultValue' in options) {
    const defaultValue = options.defaultValue;
    assert(
      `Non primitive defaultValues are not supported because they are shared between all instances. If you would like to use a complex object as a default value please provide a function that returns the complex object.`,
      typeof defaultValue !== 'object' || defaultValue === null
    );
    return defaultValue as Value;

    // new style transforms
  } else if (schema.kind !== 'attribute' && schema.type) {
    const transform = (
      store.schema as unknown as {
        transforms?: Map<
          string,
          { defaultValue(options: Record<string, unknown> | null, identifier: StableRecordIdentifier): Value }
        >;
      }
    ).transforms?.get(schema.type);

    if (transform?.defaultValue) {
      return transform.defaultValue(options || null, identifier);
    }
  }
}

function notifyAttributes(storeWrapper: CacheCapabilitiesManager, identifier: StableRecordIdentifier, keys?: string[]) {
  if (!keys) {
    storeWrapper.notifyChange(identifier, 'attributes');
    return;
  }

  for (let i = 0; i < keys.length; i++) {
    storeWrapper.notifyChange(identifier, 'attributes', keys[i]);
  }
}

/*
      TODO @deprecate IGOR DAVID
      There seems to be a potential bug here, where we will return keys that are not
      in the schema
  */
function calculateChangedKeys(cached: CachedResource, updates?: AttributesHash): string[] {
  const changedKeys: string[] = [];

  if (updates) {
    const keys = Object.keys(updates);
    const length = keys.length;
    const localAttrs = cached.localAttrs;

    const original: Record<string, unknown> = Object.assign(
      Object.create(null) as Record<string, unknown>,
      cached.remoteAttrs,
      cached.inflightAttrs
    );

    for (let i = 0; i < length; i++) {
      const key = keys[i];
      const value = updates[key];

      // A value in localAttrs means the user has a local change to
      // this attribute. We never override this value when merging
      // updates from the backend so we should not sent a change
      // notification if the server value differs from the original.
      if (localAttrs && localAttrs[key] !== undefined) {
        continue;
      }

      if (original[key] !== value) {
        changedKeys.push(key);
      }
    }
  }

  return changedKeys;
}

function cacheIsEmpty(cached: CachedResource | undefined): boolean {
  return !cached || (cached.remoteAttrs === null && cached.inflightAttrs === null && cached.localAttrs === null);
}

function _isEmpty(peeked: CachedResource | undefined): boolean {
  if (!peeked) {
    return true;
  }
  const isNew = peeked.isNew;
  const isDeleted = peeked.isDeleted;
  const isEmpty = cacheIsEmpty(peeked);

  return (!isNew || isDeleted) && isEmpty;
}

function recordIsLoaded(cached: CachedResource | undefined, filterDeleted = false): boolean {
  if (!cached) {
    return false;
  }
  const isNew = cached.isNew;
  const isEmpty = cacheIsEmpty(cached);

  // if we are new we must consider ourselves loaded
  if (isNew) {
    return !cached.isDeleted;
  }
  // even if we have a past request, if we are now empty we are not loaded
  // typically this is true after an unloadRecord call

  // if we are not empty, not new && we have a fulfilled request then we are loaded
  // we should consider allowing for something to be loaded that is simply "not empty".
  // which is how RecordState currently handles this case; however, RecordState is buggy
  // in that it does not account for unloading.
  return filterDeleted && cached.isDeletionCommitted ? false : !isEmpty;
}

function _isLoading(
  peeked: CachedResource | undefined,
  capabilities: CacheCapabilitiesManager,
  identifier: StableRecordIdentifier
): boolean {
  upgradeCapabilities(capabilities);
  // TODO refactor things such that the cache is not required to know
  // about isLoading
  const req = capabilities._store.getRequestStateService();
  // const fulfilled = req.getLastRequestForRecord(identifier);
  const isLoaded = recordIsLoaded(peeked);

  return (
    !isLoaded &&
    // fulfilled === null &&
    req.getPendingRequestsForRecord(identifier).some((r) => r.type === 'query')
  );
}

function setupRelationships(
  graph: Graph,
  storeWrapper: CacheCapabilitiesManager,
  identifier: StableRecordIdentifier,
  data: JsonApiResource
) {
  // TODO @runspired iterating by definitions instead of by payload keys
  // allows relationship payloads to be ignored silently if no relationship
  // definition exists. Ensure there's a test for this and then consider
  // moving this to an assertion. This check should possibly live in the graph.
  const relationships = storeWrapper.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
  const keys = Object.keys(relationships);
  for (let i = 0; i < keys.length; i++) {
    const relationshipName = keys[i];
    const relationshipData = data.relationships![relationshipName];

    if (!relationshipData) {
      continue;
    }

    graph.push({
      op: 'updateRelationship',
      record: identifier,
      field: relationshipName,
      value: relationshipData,
    });
  }
}

function patchLocalAttributes(cached: CachedResource): boolean {
  const { localAttrs, remoteAttrs, inflightAttrs, changes } = cached;
  if (!localAttrs) {
    cached.changes = null;
    return false;
  }
  let hasAppliedPatch = false;
  const mutatedKeys = Object.keys(localAttrs);

  for (let i = 0, length = mutatedKeys.length; i < length; i++) {
    const attr = mutatedKeys[i];
    const existing =
      inflightAttrs && attr in inflightAttrs
        ? inflightAttrs[attr]
        : remoteAttrs && attr in remoteAttrs
          ? remoteAttrs[attr]
          : undefined;

    if (existing === localAttrs[attr]) {
      hasAppliedPatch = true;
      delete localAttrs[attr];
      delete changes![attr];
    }
  }
  return hasAppliedPatch;
}

function putOne(
  cache: JSONAPICache,
  identifiers: IdentifierCache,
  resource: ExistingResourceObject
): StableExistingRecordIdentifier {
  assert(
    `You must include an 'id' for the resource data ${resource.type}`,
    resource.id !== null && resource.id !== undefined && resource.id !== ''
  );
  assert(
    `Missing Resource Type: received resource data with a type '${resource.type}' but no schema could be found with that name.`,
    cache._capabilities.getSchemaDefinitionService().doesTypeExist(resource.type)
  );
  let identifier: StableRecordIdentifier | undefined = identifiers.peekRecordIdentifier(resource);

  if (identifier) {
    identifier = identifiers.updateRecordIdentifier(identifier, resource);
  } else {
    identifier = identifiers.getOrCreateRecordIdentifier(resource);
  }
  cache.upsert(identifier, resource, cache._capabilities.hasRecord(identifier));
  // even if the identifier was not "existing" before, it is now
  return identifier as StableExistingRecordIdentifier;
}

/*
    Iterates over the set of internal models reachable from `this` across exactly one
    relationship.
  */
function _directlyRelatedIdentifiersIterable(
  storeWrapper: CacheCapabilitiesManager,
  originating: StableRecordIdentifier
) {
  const graph = peekGraph(storeWrapper);
  const initializedRelationships = graph?.identifiers.get(originating);

  if (!initializedRelationships) {
    return EMPTY_ITERATOR;
  }

  const initializedRelationshipsArr: Array<CollectionEdge | ResourceEdge> = [];
  Object.keys(initializedRelationships).forEach((key) => {
    const rel = initializedRelationships[key];
    if (rel && !isImplicit(rel)) {
      initializedRelationshipsArr.push(rel);
    }
  });

  let i = 0;
  let j = 0;
  let k = 0;

  const findNext = (): StableRecordIdentifier | undefined => {
    while (i < initializedRelationshipsArr.length) {
      while (j < 2) {
        const relatedIdentifiers =
          j === 0 ? getLocalState(initializedRelationshipsArr[i]) : getRemoteState(initializedRelationshipsArr[i]);
        while (k < relatedIdentifiers.length) {
          const relatedIdentifier = relatedIdentifiers[k++];
          if (relatedIdentifier !== null) {
            return relatedIdentifier;
          }
        }
        k = 0;
        j++;
      }
      j = 0;
      i++;
    }
    return undefined;
  };

  return {
    iterator() {
      return {
        next: (): { value: StableRecordIdentifier | undefined; done: boolean } => {
          const value = findNext();
          return { value, done: value === undefined };
        },
      };
    },
  };
}

/*
      Computes the set of Identifiers reachable from this Identifier.

      Reachability is determined over the relationship graph (ie a graph where
      nodes are identifiers and edges are belongs to or has many
      relationships).

      Returns an array including `this` and all identifiers reachable
      from `this.identifier`.
    */
function _allRelatedIdentifiers(
  storeWrapper: CacheCapabilitiesManager,
  originating: StableRecordIdentifier
): StableRecordIdentifier[] {
  const array: StableRecordIdentifier[] = [];
  const queue: StableRecordIdentifier[] = [];
  const seen = new Set();
  queue.push(originating);
  while (queue.length > 0) {
    const identifier = queue.shift()!;
    array.push(identifier);
    seen.add(identifier);

    const iterator = _directlyRelatedIdentifiersIterable(storeWrapper, originating).iterator();
    for (let obj = iterator.next(); !obj.done; obj = iterator.next()) {
      const relatedIdentifier = obj.value;
      if (relatedIdentifier && !seen.has(relatedIdentifier)) {
        seen.add(relatedIdentifier);
        queue.push(relatedIdentifier);
      }
    }
  }

  return array;
}

function isMetaDocument(
  doc: StructuredDocument<ResourceDocument>
): doc is StructuredDataDocument<ResourceMetaDocument> {
  return (
    !(doc instanceof Error) &&
    doc.content &&
    !('data' in doc.content) &&
    !('included' in doc.content) &&
    'meta' in doc.content
  );
}

function isErrorDocument(
  doc: StructuredDocument<ResourceDocument>
): doc is StructuredErrorDocument<ResourceErrorDocument> {
  return doc instanceof Error;
}

function fromBaseDocument(doc: StructuredDocument<ResourceDocument>): Partial<ResourceDocument> {
  const resourceDocument = {} as Partial<ResourceDocument>;
  const jsonApiDoc = doc.content;
  if (jsonApiDoc) {
    copyLinksAndMeta(resourceDocument, jsonApiDoc);
  }
  return resourceDocument;
}

function fromStructuredError(doc: StructuredErrorDocument<ResourceErrorDocument>): ResourceErrorDocument {
  const errorDoc: ResourceErrorDocument = {} as ResourceErrorDocument;

  if (doc.content) {
    copyLinksAndMeta(errorDoc, doc.content);

    if ('errors' in doc.content) {
      errorDoc.errors = doc.content.errors;
    } else if (typeof doc.error === 'object' && 'errors' in doc.error) {
      errorDoc.errors = doc.error.errors as Array<object>;
    } else {
      errorDoc.errors = [{ title: doc.message }];
    }
  }

  return errorDoc;
}

function copyLinksAndMeta(target: { links?: unknown; meta?: unknown }, source: object) {
  if ('links' in source) {
    target.links = source.links;
  }
  if ('meta' in source) {
    target.meta = source.meta;
  }
}
