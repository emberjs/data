import type { Store } from '@warp-drive/core';
import { LOG_CACHE } from '@warp-drive/core/build-config/debugging';
import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/core/build-config/deprecations';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';
import type { CollectionEdge, Graph, GraphEdge, ImplicitEdge, ResourceEdge } from '@warp-drive/core/graph/-private';
import { graphFor, isBelongsTo, peekGraph } from '@warp-drive/core/graph/-private';
import {
  assertPrivateCapabilities,
  fieldValueIdentity,
  isRequestKey,
  isResourceKey,
  logGroup,
} from '@warp-drive/core/store/-private';
import type { CacheCapabilitiesManager } from '@warp-drive/core/types';
import type { Cache, ChangedAttributesHash, RelationshipDiff } from '@warp-drive/core/types/cache';
import type { Change } from '@warp-drive/core/types/cache/change';
import type {
  AddResourceOperation,
  AddToDocumentOperation,
  AddToResourceRelationshipOperation,
  Op,
  Operation,
  RemoveDocumentOperation,
  RemoveFromDocumentOperation,
  RemoveFromResourceRelationshipOperation,
  RemoveResourceOperation,
  UpdateResourceFieldOperation,
  UpdateResourceOperation,
  UpdateResourceRelationshipOperation,
} from '@warp-drive/core/types/cache/operations';
import type { CollectionRelationship, ResourceRelationship } from '@warp-drive/core/types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core/types/graph';
import type { PersistedResourceKey, RequestKey, ResourceKey } from '@warp-drive/core/types/identifier';
import type { ObjectValue, Value } from '@warp-drive/core/types/json/raw';
import type {
  ImmutableRequestInfo,
  RequestContext,
  StructuredDataDocument,
  StructuredDocument,
  StructuredErrorDocument,
} from '@warp-drive/core/types/request';
import type {
  CacheableFieldSchema,
  CollectionField,
  FieldSchema,
  IdentityField,
  LegacyRelationshipField,
  ResourceField,
  SchemaArrayField,
  SchemaObjectField,
} from '@warp-drive/core/types/schema/fields';
import { isRelationshipKind, isSingleKind } from '@warp-drive/core/types/schema/fields';
import type { SchemaService } from '@warp-drive/core/types/schema/schema-service';
import type {
  CollectionResourceDataDocument,
  ResourceDataDocument,
  ResourceDocument,
  ResourceErrorDocument,
  ResourceMetaDocument,
  SingleResourceDataDocument,
} from '@warp-drive/core/types/spec/document';
import type { ApiError } from '@warp-drive/core/types/spec/error';
import type {
  CollectionResourceDocument,
  ExistingResourceObject,
  ResourceObject,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@warp-drive/core/types/spec/json-api-raw';

import { validateDocumentFields } from './validate-document-fields.ts';
import { validateDocument } from './validator/index.ts';
import { isErrorDocument, isMetaDocument } from './validator/utils.ts';

type CacheKeyManager = Store['cacheKeyManager'];

function isImplicit(relationship: GraphEdge): relationship is ImplicitEdge {
  return relationship.definition.isImplicit;
}

const EMPTY_ITERATOR = {
  iterator() {
    return {
      next() {
        return { done: true, value: undefined };
      },
    };
  },
};

/** One attributes hash on a {@link CachedResource}: a **layer** a projection is read through. */
type AttrHash = Record<string, Value | undefined>;

/**
 * The cache's entry for a single resource: its id, its attribute values split
 * across four **layers**, and the flags tracking where it sits in the
 * create/update/delete lifecycle.
 *
 * A **projection** answers "what is this field's value" by reading a stack of
 * layers top-down; the first layer holding the field wins. The two projections,
 * with their resolution orders:
 *
 * - **remote state**, what the _immutable_ record reads:
 *   {@link RESOLUTION_ORDER_REMOTE_STATE}
 * - **local state**, what an _editable_ copy reads:
 *   {@link RESOLUTION_ORDER_LOCAL_STATE}
 *
 * Local state is remote state with the uncommitted mutations laid over it. The
 * guides call those mutations "the diff"; here they are simply the top layers of
 * local state, {@link CachedResource.localAttrs | localAttrs} and
 * {@link CachedResource.inflightAttrs | inflightAttrs}.
 *
 * A field is **dirty** while `localAttrs` or `inflightAttrs` holds it. A save
 * **commits** the mutation: `didCommit` merges the in-flight values into
 * `remoteAttrs` and removes them from `inflightAttrs`. A push carrying the same
 * value as a pending edit in `localAttrs` has the same effect on that edit: the
 * server already holds it, so it is removed from `localAttrs`. "Same value" is
 * decided by the field's schema: a schema-object with an identity hash compares
 * by that hash, everything else by reference.
 *
 * Thus, a dirty field reads as mutated for local readers only, and goes on doing
 * so while its save is in flight.
 *
 * @internal
 */
interface CachedResource {
  /** The resource's id, once one is known. */
  id: string | null;

  /**
   * The top layer of local state: uncommitted mutations, held apart from remote
   * state. Any field with an entry here is dirty. Along with `inflightAttrs`,
   * this is what the guides call "the diff".
   *
   * Starting a save moves these into `inflightAttrs`, so any further
   * mutation accumulates here afresh without disturbing the request already
   * in flight.
   */
  localAttrs: AttrHash | null;

  /**
   * The middle layer of local state: the mutations an in-progress save is
   * carrying.
   *
   * Completing a save merges these into
   * {@link CachedResource.remoteAttrs | remoteAttrs} and clears this —
   * committing them. A rejected save moves them back into `localAttrs`
   * instead, without overwriting any newer edit made while it was in flight.
   */
  inflightAttrs: AttrHash | null;

  /** The top layer of remote state and the data layer beneath local state: the last known persisted values. */
  remoteAttrs: AttrHash | null;

  /**
   * The bottom layer of both projections, consulted for fields no other layer
   * holds. Only one kind of schema default is stored here: the result of a
   * legacy `defaultValue()` *function*, memoized because the function returns a
   * fresh value per call and the record must keep reading the same one. A
   * primitive `options.defaultValue` or a transformation's `defaultValue()` is
   * recomputed on every read instead. Never committed; an entry is dropped once
   * the field gets a real value, whether from a local edit or from a merge into
   * `remoteAttrs`.
   */
  defaultAttrs: AttrHash | null;

  /**
   * Errors from the most recent rejected save. A successful commit clears
   * them.
   */
  errors: ApiError[] | null;

  /**
   * Whether this record was created locally and has never been persisted.
   *
   * A payload arriving for it (or a successful commit) clears the flag.
   */
  isNew: boolean;

  /**
   * Whether this record is marked for deletion. Records the intent only;
   * see {@link CachedResource.isDeletionCommitted | isDeletionCommitted} for
   * whether the server has acted on it.
   */
  isDeleted: boolean;

  /**
   * Whether the deletion is final: the server acknowledged it, or the record
   * was never persisted and has been rolled back.
   *
   * Tracked separately from {@link CachedResource.isDeleted | isDeleted}
   * because the two imply different cleanup: a *committed* deletion has already
   * been announced as removed, so unloading the record must not announce it a
   * second time.
   */
  isDeletionCommitted: boolean;

  /**
   * The relationship state a save is carrying, retained so `DEBUG` builds can
   * assert the response agrees with what was sent. Only populated in `DEBUG`
   * builds, and only while the
   * `DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE` deprecation is
   * resolved.
   *
   * @internal
   */
  inflightRelationships?: Record<string, unknown> | null;
}

/** A layer name on a {@link CachedResource}. */
type AttrLayer = 'localAttrs' | 'inflightAttrs' | 'remoteAttrs' | 'defaultAttrs';

/**
 * A layer that exists only for the duration of a merge: the attributes arriving from the
 * server in a save response or a push. {@link partitionChangedKeys} reads it as if it were
 * already on the resource; {@link mergeIntoRemote} then folds the same attributes in, handed
 * to it directly. Never part of a reader's resolution order.
 */
type MergeLayer = 'incomingAttrs';

/** Anything a projection can be read through: a {@link CachedResource}, or the layers a merge reads, built around one. */
type Layered = Partial<Record<AttrLayer | MergeLayer, AttrHash | null>>;

/** What the immutable record reads. */
const RESOLUTION_ORDER_REMOTE_STATE = ['remoteAttrs', 'defaultAttrs'] as const;

/**
 * What a new local edit replaces: the in-flight value if a save is carrying one, else the
 * persisted value. Put another way, what the record will read once the in-flight save lands,
 * assuming the server agrees. This is local state beneath `localAttrs`, less `defaultAttrs`: an
 * edit equal to a schema default is still an edit, since nothing persisted holds that value.
 *
 * Saving does not use this baseline. {@link JSONAPICache.changedAttrs | changedAttrs} still lists
 * in-flight values as unsaved, so a second save re-sends them rather than assuming the first one
 * will succeed.
 */
const RESOLUTION_ORDER_EDIT_BASELINE = ['inflightAttrs', 'remoteAttrs'] as const;

/** What an editable copy reads. */
const RESOLUTION_ORDER_LOCAL_STATE = ['localAttrs', ...RESOLUTION_ORDER_EDIT_BASELINE, 'defaultAttrs'] as const;

// After-merge orders: what each projection will read once a merge lands. `partitionChangedKeys`
// compares them against `REMOTE_STATE` / `LOCAL_STATE` (what each projection reads now) to tell
// which projection moved, so the two sides of that comparison must resolve through the same
// layers, `defaultAttrs` included. `mergeIntoRemote` applies the same orders: every layer above
// `remoteAttrs` is folded into it, lowest precedence first, and a resource layer that was folded
// in is cleared. A commit consumes in-flight values; an upsert leaves them where they are.
const RESOLUTION_ORDER_REMOTE_AFTER_COMMIT = [
  'incomingAttrs',
  'inflightAttrs',
  ...RESOLUTION_ORDER_REMOTE_STATE,
] as const;
const RESOLUTION_ORDER_LOCAL_AFTER_COMMIT = ['localAttrs', ...RESOLUTION_ORDER_REMOTE_AFTER_COMMIT] as const;
const RESOLUTION_ORDER_REMOTE_AFTER_UPSERT = ['incomingAttrs', ...RESOLUTION_ORDER_REMOTE_STATE] as const;
const RESOLUTION_ORDER_LOCAL_AFTER_UPSERT = [
  'localAttrs',
  'inflightAttrs',
  ...RESOLUTION_ORDER_REMOTE_AFTER_UPSERT,
] as const;

/** The layers an after-merge order folds into `remoteAttrs`, lowest precedence first. */
function layersFoldedIntoRemote(order: readonly (AttrLayer | MergeLayer)[]): readonly (AttrLayer | MergeLayer)[] {
  return order.slice(0, order.indexOf('remoteAttrs')).reverse();
}

const MERGE_RESOLUTION = {
  commit: {
    remoteAfter: RESOLUTION_ORDER_REMOTE_AFTER_COMMIT,
    localAfter: RESOLUTION_ORDER_LOCAL_AFTER_COMMIT,
    folded: layersFoldedIntoRemote(RESOLUTION_ORDER_REMOTE_AFTER_COMMIT),
  },
  upsert: {
    remoteAfter: RESOLUTION_ORDER_REMOTE_AFTER_UPSERT,
    localAfter: RESOLUTION_ORDER_LOCAL_AFTER_UPSERT,
    folded: layersFoldedIntoRemote(RESOLUTION_ORDER_REMOTE_AFTER_UPSERT),
  },
} as const;
type MergeKind = keyof typeof MERGE_RESOLUTION;

function makeCache(): CachedResource {
  return {
    id: null,
    localAttrs: null,
    inflightAttrs: null,
    remoteAttrs: null,
    defaultAttrs: null,
    errors: null,
    isNew: false,
    isDeleted: false,
    isDeletionCommitted: false,
  };
}

/**
 * ```ts
 * import { JSONAPICache } from '@warp-drive/json-api';
 * ```
 *
 * A {@link Cache} implementation tuned for [{json:api}](https://jsonapi.org/)
 *
 * See [How The Cache Works](/guides/the-manual/caching/#how-the-cache-works) for the caching
 * strategy it uses.
 *
 * @summary The JSON:API cache implementation: stores documents and normalized resources, tracks local, in-flight, and
 * remote state, and manages relationships through the graph.
 * @categoryDescription Cache Management
 * APIs for primary cache management functionality
 * @categoryDescription Cache Forking
 * APIs that support Cache Forking
 * @categoryDescription SSR Support
 * APIs that support SSR functionality
 * @categoryDescription Resource Lifecycle
 * APIs that support management of resource data
 * @categoryDescription Resource Data
 * APIs that support granular field level management of resource data
 * @categoryDescription Resource State
 * APIs that support managing Resource states
 *
 * @public
 */
export class JSONAPICache implements Cache {
  /**
   * The Cache Version that this implementation implements.
   *
   * @public
   */
  declare version: '2';

  /** @internal */
  declare _capabilities: CacheCapabilitiesManager;
  /** @internal */
  declare __cache: Map<ResourceKey, CachedResource>;
  /** @internal */
  declare __destroyedCache: Map<ResourceKey, CachedResource>;
  /** @internal */
  declare __documents: Map<string, StructuredDocument<ResourceDocument>>;
  /** @internal */
  declare __graph: Graph;

  constructor(capabilities: CacheCapabilitiesManager) {
    this.version = '2';
    this._capabilities = capabilities;
    this.__cache = new Map();
    this.__graph = graphFor(capabilities);
    this.__destroyedCache = new Map();
    this.__documents = new Map();
  }

  ////////// ================ //////////
  ////////// Cache Management //////////
  ////////// ================ //////////

  /**
   * Cache the response to a request
   *
   * Implements {@link Cache.put | Cache.put}.
   *
   * Expects a {@link StructuredDocument} whose `content` member is a JsonApiDocument.
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
   * @category Cache Management
   * @public
   */
  put<T extends SingleResourceDocument>(doc: StructuredDataDocument<T>): SingleResourceDataDocument;
  put<T extends CollectionResourceDocument>(doc: StructuredDataDocument<T>): CollectionResourceDataDocument;
  put<T extends ResourceErrorDocument>(doc: StructuredErrorDocument<T>): ResourceErrorDocument;
  put<T extends ResourceMetaDocument>(doc: StructuredDataDocument<T>): ResourceMetaDocument;
  put(doc: StructuredDocument<ResourceDocument>): ResourceDocument {
    if (DEBUG) {
      validateDocument(this._capabilities, doc);
    }

    if (isErrorDocument(doc)) {
      return this._putDocument(doc, undefined, undefined);
    } else if (isMetaDocument(doc)) {
      return this._putDocument(doc, undefined, undefined);
    }

    const jsonApiDoc = doc.content as SingleResourceDocument | CollectionResourceDocument;
    const included = jsonApiDoc.included;
    let i: number, length: number;
    const { cacheKeyManager } = this._capabilities;

    if (DEBUG) {
      validateDocumentFields(this._capabilities.schema, jsonApiDoc);
    }

    if (LOG_CACHE) {
      const Counts = new Map();
      let totalCount = 0;
      if (included) {
        for (i = 0, length = included.length; i < length; i++) {
          const type = included[i].type;
          Counts.set(type, (Counts.get(type) || 0) + 1);
          totalCount++;
        }
      }
      if (Array.isArray(jsonApiDoc.data)) {
        for (i = 0, length = jsonApiDoc.data.length; i < length; i++) {
          const type = jsonApiDoc.data[i].type;
          Counts.set(type, (Counts.get(type) || 0) + 1);
          totalCount++;
        }
      } else if (jsonApiDoc.data) {
        const type = jsonApiDoc.data.type;
        Counts.set(type, (Counts.get(type) || 0) + 1);
        totalCount++;
      }

      logGroup(
        'cache',
        'put',
        '<@document>',
        doc.content?.lid || doc.request?.url || 'unknown-request',
        `(${totalCount}) records`,
        ''
      );
      let str = `\tContent Counts:`;
      Counts.forEach((count, type) => {
        str += `\n\t\t${type}: ${count} record${count > 1 ? 's' : ''}`;
      });
      if (Counts.size === 0) {
        str += `\t(empty)`;
      }
      // oxlint-disable-next-line no-console
      console.log(str);
      // oxlint-disable-next-line no-console
      console.log({
        lid: doc.content?.lid,
        content: structuredClone(doc.content),
        // we may need a specialized copy here
        request: doc.request, // structuredClone(doc.request),
        response: doc.response, // structuredClone(doc.response),
      });
      // oxlint-disable-next-line no-console
      console.groupEnd();
    }

    if (included) {
      for (i = 0, length = included.length; i < length; i++) {
        included[i] = putOne(this, cacheKeyManager, included[i]);
      }
    }

    if (Array.isArray(jsonApiDoc.data)) {
      length = jsonApiDoc.data.length;
      const identifiers: PersistedResourceKey[] = [];

      for (i = 0; i < length; i++) {
        identifiers.push(putOne(this, cacheKeyManager, jsonApiDoc.data[i]));
      }
      return this._putDocument(
        doc as StructuredDataDocument<CollectionResourceDocument>,
        identifiers,
        included as PersistedResourceKey[]
      );
    }

    if (jsonApiDoc.data === null) {
      return this._putDocument(
        doc as StructuredDataDocument<SingleResourceDocument>,
        null,
        included as PersistedResourceKey[]
      );
    }

    const identifier = putOne(this, cacheKeyManager, jsonApiDoc.data);
    return this._putDocument(
      doc as StructuredDataDocument<SingleResourceDocument>,
      identifier,
      included as PersistedResourceKey[]
    );
  }

  /** @internal */
  private _putDocument<T extends ResourceErrorDocument>(
    doc: StructuredErrorDocument<T>,
    data: undefined,
    included: undefined
  ): ResourceErrorDocument;
  /** @internal */
  private _putDocument<T extends ResourceMetaDocument>(
    doc: StructuredDataDocument<T>,
    data: undefined,
    included: undefined
  ): ResourceMetaDocument;
  /** @internal */
  private _putDocument<T extends SingleResourceDocument>(
    doc: StructuredDataDocument<T>,
    data: PersistedResourceKey | null,
    included: PersistedResourceKey[] | undefined
  ): SingleResourceDataDocument;
  /** @internal */
  private _putDocument<T extends CollectionResourceDocument>(
    doc: StructuredDataDocument<T>,
    data: PersistedResourceKey[],
    included: PersistedResourceKey[] | undefined
  ): CollectionResourceDataDocument;
  /** @internal */
  private _putDocument<T extends ResourceDocument>(
    doc: StructuredDocument<T>,
    data: PersistedResourceKey[] | PersistedResourceKey | null | undefined,
    included: PersistedResourceKey[] | undefined
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
    const identifier = request ? this._capabilities.cacheKeyManager.getOrCreateDocumentIdentifier(request) : null;

    if (identifier) {
      resourceDocument.lid = identifier.lid;

      // @ts-expect-error
      doc.content = resourceDocument;
      const hasExisting = this.__documents.has(identifier.lid);
      this.__documents.set(identifier.lid, doc);

      this._capabilities.notifyChange(identifier, hasExisting ? 'updated' : 'added', null);
    }

    const op = doc.request?.op;
    if (op === 'findHasMany' || op === 'findBelongsTo') {
      const kind = op === 'findHasMany' ? 'hasMany' : 'belongsTo';
      const parentIdentifier = doc.request.options?.identifier as ResourceKey | undefined;
      const parentField = doc.request.options?.field as LegacyRelationshipField | undefined;
      assert(`Expected a ${kind} field`, parentField?.kind === kind);
      assert(`Expected a parent identifier for a ${op} request`, parentIdentifier && isResourceKey(parentIdentifier));
      if (parentField && parentIdentifier) {
        this.__graph.push({
          op: 'updateRelationship',
          record: parentIdentifier,
          field: parentField.name,
          value: resourceDocument,
        });
      }
    }

    return resourceDocument;
  }

  /**
   * Update the "remote" or "canonical" (persisted) state of the Cache
   * by merging new information into the existing state.
   *
   * @example
   * ```ts
   * cache.patch({
   *   op: 'update',
   *   record: identifier,
   *   field: 'name',
   *   value: 'Chris',
   * });
   * ```
   *
   * @category Cache Management
   * @public
   * @param op the operation or list of operations to perform
   */
  patch(op: Operation | Operation[]): void {
    if (Array.isArray(op)) {
      if (LOG_CACHE) {
        logGroup('cache', 'patch', '<BATCH>', String(op.length) + ' operations', '', '');
      }

      assertPrivateCapabilities(this._capabilities);
      this._capabilities._store._join(() => {
        for (const operation of op) {
          patchCache(this, operation);
        }
      });

      if (LOG_CACHE) {
        // oxlint-disable-next-line no-console
        console.groupEnd();
      }
    } else {
      patchCache(this, op);
    }
  }

  /**
   * Update the "local" or "current" (unpersisted) state of the Cache
   *
   * @example
   * ```ts
   * cache.mutate({
   *   op: 'replaceRelatedRecord',
   *   record: identifier,
   *   field: 'author',
   *   value: authorIdentifier,
   * });
   * ```
   *
   * @category Cache Management
   * @public
   */
  mutate(mutation: LocalRelationshipOperation): void {
    if (LOG_CACHE) {
      logGroup('cache', 'mutate', mutation.record.type, mutation.record.lid, mutation.field, mutation.op);
      try {
        const _data = JSON.parse(JSON.stringify(mutation)) as object;
        // oxlint-disable-next-line no-console
        console.log(_data);
      } catch {
        // oxlint-disable-next-line no-console
        console.log(mutation);
      }
    }
    this.__graph.update(mutation, false);

    if (LOG_CACHE) {
      // oxlint-disable-next-line no-console
      console.groupEnd();
    }
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
   * This generally takes the place of {@link JSONAPICache.getAttr | getAttr} as
   * an API and may even take the place of {@link JSONAPICache.getRelationship | getRelationship}
   * depending on implementation specifics, though this
   * latter usage is less recommended due to the advantages
   * of the Graph handling necessary entanglements and
   * notifications for relational data.
   *
   * :::warning
   * It is not recommended to use the return value as
   * a serialized representation of the resource both
   * due to it containing local mutations and because
   * it may contain additional fields not recognized
   * by the {json:api} API implementation such as `lid` and
   * the various internal WarpDrive bookkeeping fields.
   * :::
   *
   * @example
   * ```ts
   * const resource = cache.peek(identifier);
   * const document = cache.peek(requestKey);
   * ```
   *
   * @category Cache Management
   * @public
   */
  peek(identifier: ResourceKey): ResourceObject | null;
  peek(identifier: RequestKey): ResourceDocument | null;
  peek(identifier: RequestKey | ResourceKey): ResourceObject | ResourceDocument | null {
    if (isResourceKey(identifier)) {
      const peeked = this.__safePeek(identifier, false);

      if (!peeked) {
        return null;
      }

      const { type, id, lid } = identifier;
      const attributes = structuredClone(
        Object.assign({}, peeked.remoteAttrs, peeked.inflightAttrs, peeked.localAttrs)
      ) as ObjectValue;
      const relationships: ResourceObject['relationships'] = {};

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

      assertPrivateCapabilities(this._capabilities);
      const store = this._capabilities._store;
      const attrs = getCacheFields(this, identifier);
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
      if ('content' in document) return document.content!;
    }
    return null;
  }

  /**
   * Peek the remote resource data from the Cache.
   *
   * @example
   * ```ts
   * const resource = cache.peekRemoteState(identifier);
   * const document = cache.peekRemoteState(requestKey);
   * ```
   *
   * @category Cache Management
   * @public
   */
  peekRemoteState(identifier: ResourceKey): ResourceObject | null;
  peekRemoteState(identifier: RequestKey): ResourceDocument | null;
  peekRemoteState(identifier: RequestKey | ResourceKey): ResourceObject | ResourceDocument | null {
    if (isResourceKey(identifier)) {
      const peeked = this.__safePeek(identifier, false);

      if (!peeked) {
        return null;
      }

      const { type, id, lid } = identifier;
      const attributes = structuredClone(peeked.remoteAttrs) as ObjectValue;
      const relationships: ResourceObject['relationships'] = {};

      const rels = this.__graph.identifiers.get(identifier);
      if (rels) {
        Object.keys(rels).forEach((key) => {
          const rel = rels[key];
          if (rel.definition.isImplicit) {
            return;
          } else {
            relationships[key] = structuredClone(this.__graph.getData(identifier, key));
          }
        });
      }

      assertPrivateCapabilities(this._capabilities);
      const store = this._capabilities._store;
      const attrs = getCacheFields(this, identifier);
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
      if ('content' in document) return document.content!;
    }
    return null;
  }

  /**
   * Peek the Cache for the existing request data associated with
   * a cacheable request.
   *
   * This is effectively the reverse of {@link JSONAPICache.put | put} for a request in
   * that it will return the the request, response, and content
   * whereas {@link JSONAPICache.peek | peek} will return just the `content`.
   *
   * @example
   * ```ts
   * const doc = cache.peekRequest(requestKey);
   * ```
   *
   * @category Cache Management
   * @public
   */
  peekRequest(identifier: RequestKey): StructuredDocument<ResourceDocument> | null {
    return this.__documents.get(identifier.lid) || null;
  }

  /**
   * Push resource data from a remote source into the cache for this identifier
   *
   * @example
   * ```ts
   * cache.upsert(identifier, {
   *   type: 'user',
   *   id: '1',
   *   attributes: { name: 'Chris' },
   * });
   * ```
   *
   * @category Cache Management
   * @public
   * @return when `calculateChanges` is true, the names of the attributes whose persisted value
   *   this push changed (the same keys the `'remote'` channel is notified with), or `undefined`
   *   when none did. Otherwise `void`.
   */
  upsert(identifier: ResourceKey, data: ExistingResourceObject, calculateChanges?: boolean): void | string[] {
    assertPrivateCapabilities(this._capabilities);
    const store = this._capabilities._store;
    if (!store._cbs) {
      let result: void | string[] = undefined;

      store._run(() => {
        result = cacheUpsert(this, identifier, data, calculateChanges);
      });
      return result;
    }

    return cacheUpsert(this, identifier, data, calculateChanges);
  }

  ////////// ============= //////////
  ////////// Cache Forking //////////
  ////////// ============= //////////

  /**
   * Create a fork of the cache from the current state.
   *
   * Applications should typically not call this method themselves,
   * preferring instead to fork at the Store level, which will
   * utilize this method to fork the cache.
   *
   * @category Cache Forking
   * @private
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
   * @category Cache Forking
   * @private
   */
  merge(_cache: Cache): Promise<void> {
    throw new Error(`Not Implemented`);
  }

  /**
   * Generate the list of changes applied to all
   * record in the store.
   *
   * Each individual resource or document that has
   * been mutated should be described as an individual
   * {@link Change} entry in the returned array.
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
   *  identifier: ResourceKey | RequestKey;
   *  op: 'upsert' | 'remove';
   *  patch?: unknown;
   * }
   * ```
   *
   * @category Cache Forking
   * @private
   */
  diff(): Promise<Change[]> {
    throw new Error(`Not Implemented`);
  }

  ////////// =========== //////////
  ////////// SSR Support //////////
  ////////// =========== //////////

  /**
   * Serialize the entire contents of the Cache into a Stream
   * which may be fed back into a new instance of the same Cache
   * via `cache.hydrate`.
   *
   * @category SSR Support
   * @private
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
   * @category SSR Support
   * @private
   */
  hydrate(stream: ReadableStream<unknown>): Promise<void> {
    throw new Error('Not Implemented');
  }

  ////////// ================== //////////
  ////////// Resource Lifecycle //////////
  ////////// ================== //////////

  /**
   * [LIFECYCLE] Signal to the cache that a new record has been instantiated on the client
   *
   * It returns properties from options that should be set on the record during the create
   * process. This return value behavior is deprecated.
   *
   * @example
   * ```ts
   * cache.clientDidCreate(identifier, { name: 'Chris' });
   * ```
   *
   * @category Resource Lifecycle
   * @public
   */
  clientDidCreate(identifier: ResourceKey, options?: Record<string, Value>): Record<string, unknown> {
    if (LOG_CACHE) {
      try {
        const _data = options ? (JSON.parse(JSON.stringify(options)) as object) : options;
        // oxlint-disable-next-line no-console
        console.log(`WarpDrive | Mutation - clientDidCreate ${identifier.lid}`, _data);
      } catch {
        // oxlint-disable-next-line no-console
        console.log(`WarpDrive | Mutation - clientDidCreate ${identifier.lid}`, options);
      }
    }
    const cached = this._createCache(identifier);
    cached.isNew = true;
    const createOptions: Record<string, unknown> = {};

    if (options !== undefined) {
      const fields = getCacheFields(this, identifier);
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
          case 'resource':
            this.mutate({
              op: 'replaceRelatedRecord',
              field: name,
              record: identifier,
              value: propertyValue as ResourceKey | null,
            });
            relationship = graph.get(identifier, name) as ResourceEdge;
            relationship.state.hasReceivedData = true;
            relationship.state.isEmpty = false;
            break;
          case 'hasMany':
          case 'collection':
            this.mutate({
              op: 'replaceRelatedRecords',
              field: name,
              record: identifier,
              value: propertyValue as unknown as ResourceKey[],
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

    this._capabilities.notifyChange(identifier, 'added', null);

    return createOptions;
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * will be part of a save transaction.
   *
   * @example
   * ```ts
   * cache.willCommit(identifier, context);
   * ```
   *
   * @category Resource Lifecycle
   * @public
   */
  willCommit(identifier: ResourceKey | ResourceKey[], _context: RequestContext | null): void {
    if (Array.isArray(identifier)) {
      for (const key of identifier) {
        willCommit(this, key);
      }
    } else {
      willCommit(this, identifier);
    }
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was successfully updated as part of a save transaction.
   *
   * @example
   * ```ts
   * cache.didCommit(identifier, result);
   * ```
   *
   * @category Resource Lifecycle
   * @public
   */
  didCommit(
    committedIdentifier: ResourceKey,
    result: StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject, ExistingResourceObject>> | null
  ): SingleResourceDataDocument;
  didCommit(
    committedIdentifier: ResourceKey[],
    result: StructuredDataDocument<SingleResourceDataDocument<ExistingResourceObject, ExistingResourceObject>> | null
  ): SingleResourceDataDocument;
  didCommit(
    committedIdentifier: ResourceKey[],
    result: StructuredDataDocument<CollectionResourceDataDocument<ExistingResourceObject>> | null
  ): CollectionResourceDataDocument;
  didCommit(
    committedIdentifier: ResourceKey | ResourceKey[],
    result: StructuredDataDocument<
      | SingleResourceDataDocument<ExistingResourceObject, ExistingResourceObject>
      | CollectionResourceDataDocument<ExistingResourceObject>
    > | null
  ): CollectionResourceDataDocument | SingleResourceDataDocument {
    const payload = result ? result.content : null;
    const operation = result?.request?.op ?? null;
    const data = payload && payload.data;

    if (LOG_CACHE) {
      try {
        const payloadCopy: unknown = payload ? JSON.parse(JSON.stringify(payload)) : payload;
        // oxlint-disable-next-line no-console
        console.log(`WarpDrive | Payload - ${operation}`, payloadCopy);
      } catch {
        // oxlint-disable-next-line no-console
        console.log(`WarpDrive | Payload - ${operation}`, payload);
      }
    }

    const responseIsCollection = Array.isArray(data);
    const hasMultipleIdentifiers = Array.isArray(committedIdentifier) && committedIdentifier.length > 1;

    if (Array.isArray(committedIdentifier)) {
      // if we get back an array of primary data, we treat each
      // entry as a separate commit for each identifier
      assert(
        `Expected the array of primary data to match the array of committed identifiers`,
        !hasMultipleIdentifiers || !responseIsCollection || data.length === committedIdentifier.length
      );
      if (responseIsCollection) {
        for (let i = 0; i < committedIdentifier.length; i++) {
          const identifier = committedIdentifier[i];
          didCommit(this, identifier, data[i] ?? null, operation);
        }
        // but if we get back no data or a single entry, we apply
        // the change back to the original identifier
      } else {
        for (let i = 0; i < committedIdentifier.length; i++) {
          const identifier = committedIdentifier[i];
          didCommit(this, identifier, i === 0 ? data : null, operation);
        }
      }
    } else {
      didCommit(this, committedIdentifier, data as ExistingResourceObject | null, operation);
    }

    const included = payload && payload.included;
    const { cacheKeyManager } = this._capabilities;
    if (included) {
      for (let i = 0, length = included.length; i < length; i++) {
        putOne(this, cacheKeyManager, included[i]);
      }
    }

    return hasMultipleIdentifiers && responseIsCollection
      ? {
          data: committedIdentifier as PersistedResourceKey[],
        }
      : {
          data: (Array.isArray(committedIdentifier)
            ? committedIdentifier[0]
            : committedIdentifier) as PersistedResourceKey,
        };
  }

  /**
   * [LIFECYCLE] Signals to the cache that a resource
   * was update via a save transaction failed.
   *
   * @example
   * ```ts
   * cache.commitWasRejected(identifier, errors);
   * ```
   *
   * @category Resource Lifecycle
   * @public
   */
  commitWasRejected(identifier: ResourceKey | ResourceKey[], errors?: ApiError[]): void {
    if (Array.isArray(identifier)) {
      for (let i = 0; i < identifier.length; i++) {
        commitDidError(this, identifier[i], errors && i === 0 ? errors : null);
      }
      return;
    }

    return commitDidError(this, identifier, errors || null);
  }

  /**
   * [LIFECYCLE] Signals to the cache that all data for a resource
   * should be cleared.
   *
   * This method is a candidate to become a mutation
   *
   * @example
   * ```ts
   * cache.unloadRecord(identifier);
   * ```
   *
   * @category Resource Lifecycle
   * @public
   */
  unloadRecord(identifier: ResourceKey): void {
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

    if (cached.isNew || cached.isDeletionCommitted) {
      peekGraph(storeWrapper)?.push({
        op: 'deleteRecord',
        record: identifier,
        isNew: cached.isNew,
      });
    } else {
      peekGraph(storeWrapper)?.unload(identifier);
    }

    // effectively clearing these is ensuring that
    // we report as `isEmpty` during teardown.
    cached.localAttrs = null;
    cached.remoteAttrs = null;
    cached.defaultAttrs = null;
    cached.inflightAttrs = null;

    const relatedIdentifiers = _allRelatedIdentifiers(storeWrapper, identifier);
    if (areAllModelsUnloaded(storeWrapper, relatedIdentifiers)) {
      for (let i = 0; i < relatedIdentifiers.length; ++i) {
        const relatedIdentifier = relatedIdentifiers[i];
        storeWrapper.notifyChange(relatedIdentifier, 'removed', null);
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
      storeWrapper.notifyChange(identifier, 'removed', null);
    }
  }

  ////////// ============= //////////
  ////////// Resource Data //////////
  ////////// ============= //////////

  /**
   * Retrieve the data for an attribute from the cache
   * with local mutations applied.
   *
   * @example
   * ```ts
   * const name = cache.getAttr(identifier, 'name');
   * const zip = cache.getAttr(identifier, ['address', 'zip']);
   * ```
   *
   * @category Resource Data
   * @public
   */
  getAttr(identifier: ResourceKey, attr: string | string[]): Value | undefined {
    const isSimplePath = !Array.isArray(attr) || attr.length === 1;
    if (Array.isArray(attr) && attr.length === 1) {
      attr = attr[0];
    }

    if (isSimplePath) {
      const attribute = attr as string;
      const cached = this.__peek(identifier, true);
      assert(
        `Cannot retrieve attributes for identifier ${String(identifier)} as it is not present in the cache`,
        cached
      );

      // in Prod we try to recover when accessing something that
      // doesn't exist
      if (!cached) {
        return undefined;
      }

      const layer = layerHolding(attribute, cached, RESOLUTION_ORDER_LOCAL_STATE);
      if (layer) {
        return layer[attribute];
      }
      const attrSchema = getCacheFields(this, identifier).get(attribute);

      assertPrivateCapabilities(this._capabilities);
      const defaultValue = getDefaultValue(attrSchema, identifier, this._capabilities._store);
      if (schemaHasLegacyDefaultValueFn(attrSchema)) {
        cached.defaultAttrs = cached.defaultAttrs || (Object.create(null) as Record<string, Value>);
        cached.defaultAttrs[attribute] = defaultValue;
      }
      return defaultValue;
    }

    // TODO @runspired consider whether we need a defaultValue cache in ReactiveResource
    // like we do for the simple case above.
    const cached = this.__peek(identifier, true);
    return resolveAttr(attr, cached, RESOLUTION_ORDER_LOCAL_STATE);
  }

  /**
   * Retrieve the remote data for an attribute from the cache
   *
   * @example
   * ```ts
   * const name = cache.getRemoteAttr(identifier, 'name');
   * ```
   *
   * @category Resource Data
   * @public
   */
  getRemoteAttr(identifier: ResourceKey, attr: string | string[]): Value | undefined {
    const isSimplePath = !Array.isArray(attr) || attr.length === 1;
    if (Array.isArray(attr) && attr.length === 1) {
      attr = attr[0];
    }

    if (isSimplePath) {
      const attribute = attr as string;
      const cached = this.__peek(identifier, true);
      assert(
        `Cannot retrieve remote attributes for identifier ${String(identifier)} as it is not present in the cache`,
        cached
      );

      // in Prod we try to recover when accessing something that
      // doesn't exist
      if (!cached) {
        return undefined;
      }

      const layer = layerHolding(attribute, cached, RESOLUTION_ORDER_REMOTE_STATE);
      if (layer) {
        return layer[attribute];
      }
      const attrSchema = getCacheFields(this, identifier).get(attribute);

      assertPrivateCapabilities(this._capabilities);
      const defaultValue = getDefaultValue(attrSchema, identifier, this._capabilities._store);
      if (schemaHasLegacyDefaultValueFn(attrSchema)) {
        cached.defaultAttrs = cached.defaultAttrs || (Object.create(null) as Record<string, Value>);
        cached.defaultAttrs[attribute] = defaultValue;
      }
      return defaultValue;
    }

    // TODO @runspired consider whether we need a defaultValue cache in ReactiveResource
    // like we do for the simple case above.
    const cached = this.__peek(identifier, true);
    return resolveAttr(attr, cached, RESOLUTION_ORDER_REMOTE_STATE);
  }

  /**
   * Mutate the data for an attribute in the cache
   *
   * This method is a candidate to become a mutation
   *
   * @example
   * ```ts
   * cache.setAttr(identifier, 'name', 'Chris');
   * ```
   *
   * @category Resource Data
   * @public
   */
  setAttr(identifier: ResourceKey, attr: string | string[], value: Value): void {
    // this assert works to ensure we have a non-empty string and/or a non-empty array
    assert('setAttr must receive at least one attribute path', attr.length > 0);
    // `undefined` is not a JSON value: the cache could hold it but never serialize it faithfully
    // (the legacy serializer dropped the key, `serializePatch` sent `null`). Refuse it in dev and
    // store `null` in prod. If this assertion fires in your app and you feel like this behavior is
    // incorrect, open an issue and ping @runspired, who asked for it.
    assert(
      `Cannot set '${Array.isArray(attr) ? attr.join('.') : attr}' on '${identifier.type}' to undefined: undefined is not a JSON value. Use null instead. If you feel like this behavior is incorrect, open an issue and ping @runspired.`,
      (value as Value | undefined) !== undefined
    );
    if ((value as Value | undefined) === undefined) {
      value = null;
    }
    // a one-segment path replaces the field's whole value; a longer path patches one leaf into a
    // clone of the baseline object, so nested edits accumulate and the object is never rebuilt
    const isSimplePath = !Array.isArray(attr) || attr.length === 1;

    if (Array.isArray(attr) && attr.length === 1) {
      attr = attr[0];
    }

    if (isSimplePath) {
      const cached = this.__peek(identifier, false);
      const currentAttr = attr as string;
      const baseline = resolveAttr(currentAttr, cached, RESOLUTION_ORDER_EDIT_BASELINE);

      if (baseline !== value) {
        cached.localAttrs = cached.localAttrs || (Object.create(null) as Record<string, Value>);
        cached.localAttrs[currentAttr] = value;
      } else if (cached.localAttrs) {
        delete cached.localAttrs[currentAttr];
      }

      if (cached.defaultAttrs && currentAttr in cached.defaultAttrs) {
        delete cached.defaultAttrs[currentAttr];
      }

      // a local edit has no remote implication; remote-only readers can't see it anyway.
      this._capabilities.notifyChange(identifier, 'attributes', currentAttr, 'local');
      return;
    }

    // guaranteed that we have path of at least 2 in length
    const path: string[] = attr as string[];

    const cached = this.__peek(identifier, false);

    const basePath = path[0];
    const baseline = resolveAttr(basePath, cached, RESOLUTION_ORDER_EDIT_BASELINE);
    const isRevert = valueAtPath(baseline, path) === value;
    const hasLocalClone = !!cached.localAttrs && basePath in cached.localAttrs;

    // writing the baseline value into an unedited field changes nothing
    if (isRevert && !hasLocalClone) {
      return;
    }

    // every nested edit lands in a clone of the object the record currently reads, so sibling edits
    // survive one another. With nothing persisted that object is the memoized default, if any; the
    // edit still counts as an edit, since no persisted value holds it.
    cached.localAttrs = cached.localAttrs || (Object.create(null) as Record<string, Value>);
    if (!hasLocalClone) {
      const seed = baseline ?? (cached.defaultAttrs ? cached.defaultAttrs[basePath] : undefined);
      assert(
        `Cannot set '${path.join('.')}' on '${identifier.type}': '${basePath}' holds no object to write into`,
        !!seed && typeof seed === 'object'
      );
      cached.localAttrs[basePath] = structuredClone(seed);
    }
    let currentLocal = cached.localAttrs[basePath] as ObjectValue;
    let nextLink = 1;
    while (nextLink < path.length - 1) {
      currentLocal = currentLocal[path[nextLink++]] as ObjectValue;
    }
    if (currentLocal[path[nextLink]] === value) {
      return;
    }
    currentLocal[path[nextLink]] = value;

    // a revert can bring the whole clone back to the baseline, which ends the edit
    if (isRevert) {
      const field = getCacheFields(this, identifier).get(basePath);
      if (localCloneMatchesBaseline(this._capabilities.schema, field, baseline, cached.localAttrs[basePath])) {
        delete cached.localAttrs[basePath];
      }
    }

    if (cached.defaultAttrs && basePath in cached.defaultAttrs) {
      delete cached.defaultAttrs[basePath];
    }

    // a local edit has no remote implication; remote-only readers can't see it anyway.
    this._capabilities.notifyChange(identifier, 'attributes', basePath, 'local');
  }

  /**
   * Query the cache for the changed attributes of a resource: every unsaved
   * mutation, as a `[before, after]` pair per field.
   *
   * `before` is the value the mutation replaces, which is not always the
   * persisted one. A mutation a save is carrying replaces remote state; an edit
   * made while that save is in flight replaces the in-flight value. So this is
   * what saving from here would change, which is what `serializePatch` and the
   * legacy `Snapshot` consume, rather than a diff against persisted state.
   *
   * Derived from the layers on each call, so it is always consistent with
   * {@link JSONAPICache.getAttr | getAttr} and
   * {@link JSONAPICache.rollbackAttrs | rollbackAttrs}. Dirtiness does not go
   * through here; see {@link JSONAPICache.hasChangedAttrs | hasChangedAttrs}.
   *
   * @example
   * ```ts
   * const changes = cache.changedAttrs(identifier);
   * // { name: ['Igor', 'Chris'] }
   * ```
   *
   * @category Resource Data
   * @public
   * @return `{ '<field>': ['<old>', '<new>'] }`
   */
  changedAttrs(identifier: ResourceKey): ChangedAttributesHash {
    const cached = this.__peek(identifier, false);
    assert(
      `Cannot retrieve changed attributes for identifier ${String(identifier)} as it is not present in the cache`,
      cached
    );

    const changes = Object.create(null) as ChangedAttributesHash;
    // in Prod we try to recover when accessing something that
    // doesn't exist
    if (!cached) {
      return changes;
    }

    const { localAttrs, inflightAttrs, remoteAttrs } = cached;
    if (inflightAttrs) {
      const keys = Object.keys(inflightAttrs);
      for (let i = 0; i < keys.length; i++) {
        // a stored value is never `undefined`: `setAttr` refuses it
        changes[keys[i]] = [remoteAttrs ? remoteAttrs[keys[i]] : undefined, inflightAttrs[keys[i]] as Value];
      }
    }
    if (localAttrs) {
      const keys = Object.keys(localAttrs);
      for (let i = 0; i < keys.length; i++) {
        changes[keys[i]] = [resolveAttr(keys[i], cached, RESOLUTION_ORDER_EDIT_BASELINE), localAttrs[keys[i]] as Value];
      }
    }
    return changes;
  }

  /**
   * Query the cache for whether any mutated attributes exist
   *
   * @example
   * ```ts
   * if (cache.hasChangedAttrs(identifier)) {
   *   // ...
   * }
   * ```
   *
   * @category Resource Data
   * @public
   */
  hasChangedAttrs(identifier: ResourceKey): boolean {
    const cached = this.__peek(identifier, true);
    assert(
      `Cannot retrieve changed attributes for identifier ${String(identifier)} as it is not present in the cache`,
      cached
    );

    // in Prod we try to recover when accessing something that
    // doesn't exist
    if (!cached) {
      return false;
    }

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
   * @example
   * ```ts
   * const restoredKeys = cache.rollbackAttrs(identifier);
   * ```
   *
   * @category Resource Data
   * @public
   * @return the names of fields that were restored
   */
  rollbackAttrs(identifier: ResourceKey): string[] {
    const cached = this.__peek(identifier, false);
    let dirtyKeys: string[] | undefined;
    cached.isDeleted = false;

    if (cached.localAttrs !== null) {
      dirtyKeys = Object.keys(cached.localAttrs);
      cached.localAttrs = null;
    }

    if (cached.isNew) {
      // > Note: Graph removal handled by unloadRecord
      cached.isDeletionCommitted = true;
      cached.isDeleted = true;
      cached.isNew = false;
    }

    cached.inflightAttrs = null;
    cached.defaultAttrs = null;

    if (cached.errors) {
      cached.errors = null;
      this._capabilities.notifyChange(identifier, 'errors', null);
    }

    this._capabilities.notifyChange(identifier, 'state', null);

    if (dirtyKeys && dirtyKeys.length) {
      // `dirtyKeys` is a plain array here (from `Object.keys`), but
      // `notifyChange`/`notify` batch as a `Set<string>`, so wrap it before
      // handing it off.
      this._capabilities.notifyChange(identifier, 'attributes', new Set(dirtyKeys));
    }

    return dirtyKeys || [];
  }

  /**
   * Query the cache for the changes to relationships of a resource.
   *
   * Returns a map of relationship names to {@link RelationshipDiff} objects.
   *
   * ```ts
   * type RelationshipDiff =
     | {
        kind: 'collection';
        remoteState: ResourceKey[];
        additions: Set<ResourceKey>;
        removals: Set<ResourceKey>;
        localState: ResourceKey[];
        reordered: boolean;
       }
     | {
        kind: 'resource';
        remoteState: ResourceKey | null;
        localState: ResourceKey | null;
      };
      ```
   *
   * @example
   * ```ts
   * const diffs = cache.changedRelationships(identifier);
   * const comments = diffs.get('comments');
   * ```
   *
   * @category Resource Data
   * @public
   */
  changedRelationships(identifier: ResourceKey): Map<string, RelationshipDiff> {
    return this.__graph.getChanged(identifier);
  }

  /**
   * Query the cache for whether any mutated relationships exist
   *
   * @example
   * ```ts
   * if (cache.hasChangedRelationships(identifier)) {
   *   // ...
   * }
   * ```
   *
   * @category Resource Data
   * @public
   */
  hasChangedRelationships(identifier: ResourceKey): boolean {
    return this.__graph.hasChanged(identifier);
  }

  /**
   * Tell the cache to discard any uncommitted mutations to relationships.
   *
   * This will also discard the change on any appropriate inverses.
   *
   * This method is a candidate to become a mutation
   *
   * @example
   * ```ts
   * const restoredFields = cache.rollbackRelationships(identifier);
   * ```
   *
   * @category Resource Data
   * @public
   * @return the names of relationships that were restored
   */
  rollbackRelationships(identifier: ResourceKey): string[] {
    assertPrivateCapabilities(this._capabilities);
    let result!: string[];

    this._capabilities._store._join(() => {
      result = this.__graph.rollback(identifier);
    });
    return result;
  }

  /**
   * Query the cache for the current state of a relationship property
   *
   * @example
   * ```ts
   * const relationship = cache.getRelationship(identifier, 'comments');
   * ```
   *
   * @category Resource Data
   * @public
   * @return resource relationship object
   */
  getRelationship(identifier: ResourceKey, field: string): ResourceRelationship | CollectionRelationship {
    return this.__graph.getData(identifier, field);
  }

  /**
   * Query the cache for the remote state of a relationship property
   *
   * @example
   * ```ts
   * const relationship = cache.getRemoteRelationship(identifier, 'comments');
   * ```
   *
   * @category Resource Data
   * @public
   * @return resource relationship object
   */
  getRemoteRelationship(identifier: ResourceKey, field: string): ResourceRelationship | CollectionRelationship {
    return this.__graph.getRemoteData(identifier, field);
  }

  ////////// ============== //////////
  ////////// Resource State //////////
  ////////// ============== //////////

  /**
   * Update the cache state for the given resource to be marked
   * as locally deleted, or remove such a mark.
   *
   * This method is a candidate to become a mutation
   *
   * @example
   * ```ts
   * cache.setIsDeleted(identifier, true);
   * ```
   *
   * @category Resource State
   * @public
   */
  setIsDeleted(identifier: ResourceKey, isDeleted: boolean): void {
    const cached = this.__peek(identifier, false);
    cached.isDeleted = isDeleted;
    // > Note: Graph removal for isNew handled by unloadRecord
    this._capabilities.notifyChange(identifier, 'state', null);
  }

  /**
   * Query the cache for any validation errors applicable to the given resource.
   *
   * @example
   * ```ts
   * const errors = cache.getErrors(identifier);
   * ```
   *
   * @category Resource State
   * @public
   */
  getErrors(identifier: ResourceKey): ApiError[] {
    return this.__peek(identifier, true).errors || [];
  }

  /**
   * Query the cache for whether a given resource has any available data
   *
   * @example
   * ```ts
   * if (cache.isEmpty(identifier)) {
   *   // ...
   * }
   * ```
   *
   * @category Resource State
   * @public
   */
  isEmpty(identifier: ResourceKey): boolean {
    const cached = this.__safePeek(identifier, true);
    return cached ? cached.remoteAttrs === null && cached.inflightAttrs === null && cached.localAttrs === null : true;
  }

  /**
   * Query the cache for whether a given resource was created locally and not
   * yet persisted.
   *
   * @example
   * ```ts
   * if (cache.isNew(identifier)) {
   *   // ...
   * }
   * ```
   *
   * @category Resource State
   * @public
   */
  isNew(identifier: ResourceKey): boolean {
    // TODO can we assert here?
    return this.__safePeek(identifier, true)?.isNew || false;
  }

  /**
   * Query the cache for whether a given resource is marked as deleted (but not
   * necessarily persisted yet).
   *
   * @example
   * ```ts
   * if (cache.isDeleted(identifier)) {
   *   // ...
   * }
   * ```
   *
   * @category Resource State
   * @public
   */
  isDeleted(identifier: ResourceKey): boolean {
    // TODO can we assert here?
    return this.__safePeek(identifier, true)?.isDeleted || false;
  }

  /**
   * Query the cache for whether a given resource has been deleted and that deletion
   * has also been persisted.
   *
   * @example
   * ```ts
   * if (cache.isDeletionCommitted(identifier)) {
   *   // ...
   * }
   * ```
   *
   * @category Resource State
   * @public
   */
  isDeletionCommitted(identifier: ResourceKey): boolean {
    // TODO can we assert here?
    return this.__safePeek(identifier, true)?.isDeletionCommitted || false;
  }

  /**
   * Private method used to populate an entry for the identifier
   *
   * @internal
   */
  _createCache(identifier: ResourceKey): CachedResource {
    assert(`Expected no resource data to yet exist in the cache`, !this.__cache.has(identifier));
    const cache = makeCache();
    this.__cache.set(identifier, cache);
    return cache;
  }

  /**
   * Peek whether we have cached resource data matching the identifier
   * without asserting if the resource data is missing.
   *
   * @internal
   */
  __safePeek(identifier: ResourceKey, allowDestroyed: boolean): CachedResource | undefined {
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
   * @internal
   */
  __peek(identifier: ResourceKey, allowDestroyed: boolean): CachedResource {
    const resource = this.__safePeek(identifier, allowDestroyed);
    assert(
      `Expected Cache to have a resource entry for the identifier ${String(identifier)} but none was found`,
      resource
    );
    return resource;
  }
}

function addResourceToDocument(cache: JSONAPICache, op: AddToDocumentOperation): void {
  assert(`Expected field to be either 'data' or 'included'`, op.field === 'data' || op.field === 'included');

  const doc = cache.__documents.get(op.record.lid);
  assert(`Expected to have a cached document on which to perform the add operation`, doc);
  assert(`Expected to have content on the document`, doc.content);
  const { content } = doc;

  if (op.field === 'data') {
    let shouldNotify: boolean;
    assert(`Expected to have a data property on the document`, 'data' in content);
    asDoc<ResourceDataDocument>(content);

    // if data is not an array, we set the data property directly
    if (!Array.isArray(content.data)) {
      assert(`Expected to have a single record as the operation value`, op.value && !Array.isArray(op.value));
      shouldNotify = content.data !== op.value;
      if (shouldNotify) content.data = op.value;
      assert(
        `The value '${op.value.lid}' cannot be added from the data of document '${op.record.lid}' as it is already the current value '${content.data ? content.data.lid : '<null>'}'`,
        shouldNotify
      );
    } else {
      assert(`Expected to have a non-null operation value`, op.value);

      if (Array.isArray(op.value)) {
        if (op.index !== undefined) {
          // for collections, because we allow duplicates we are always changed.
          shouldNotify = true;
          content.data.splice(op.index, 0, ...op.value);
        } else {
          // for collections, because we allow duplicates we are always changed.
          shouldNotify = true;
          content.data.push(...op.value);
        }
      } else {
        if (op.index !== undefined) {
          // for collections, because we allow duplicates we are always changed.
          shouldNotify = true;
          content.data.splice(op.index, 0, op.value);
        } else {
          // for collections, because we allow duplicates we are always changed.
          shouldNotify = true;
          content.data.push(op.value);
        }
      }
    }

    // notify
    if (shouldNotify) cache._capabilities.notifyChange(op.record, 'updated', null);
    return;
  }

  asDoc<ResourceDataDocument>(content);
  content.included = content.included || [];

  assert(`Expected to have a non-null operation value`, op.value);
  if (Array.isArray(op.value)) {
    // included is not allowed to have duplicates, so we do a dirty check here
    assert(
      `included should not contain duplicate members`,
      new Set([...content.included, ...op.value]).size === content.included.length + op.value.length
    );
    content.included = content.included.concat(op.value);
  } else {
    // included is not allowed to have duplicates, so we do a dirty check here
    assert(`included should not contain duplicate members`, content.included.includes(op.value) === false);
    content.included.push(op.value);
  }

  // we don't notify in the included case because this is not reactively
  // exposed. We should possibly consider doing so though for subscribers
}

function removeResourceFromDocument(cache: JSONAPICache, op: RemoveFromDocumentOperation): void {
  assert(`Expected field to be either 'data' or 'included'`, op.field === 'data' || op.field === 'included');

  const doc = cache.__documents.get(op.record.lid);
  assert(`Expected to have a cached document on which to perform the remove operation`, doc);
  assert(`Expected to have content on the document`, doc.content);
  const { content } = doc;

  if (op.field === 'data') {
    let shouldNotify = false;
    assert(`Expected to have a data property on the document`, 'data' in content);
    asDoc<ResourceDataDocument>(content);

    // if data is not an array, we set the data property directly
    if (!Array.isArray(content.data)) {
      assert(`Expected to have a single record as the operation value`, op.value && !Array.isArray(op.value));
      shouldNotify = content.data === op.value;
      // we only remove the value if it was our existing value
      if (shouldNotify) content.data = null;
      assert(
        `The value '${op.value.lid}' cannot be removed from the data of document '${op.record.lid}' as it is not the current value '${content.data ? content.data.lid : '<null>'}'`,
        shouldNotify
      );
    } else {
      assert(`Expected to have a non-null operation value`, op.value);
      const toRemove = Array.isArray(op.value) ? op.value : [op.value];

      for (let i = 0; i < toRemove.length; i++) {
        const value = toRemove[i];
        if (op.index !== undefined) {
          // in production we want to recover gracefully
          // so we fallback to first-index-of
          const index: number =
            op.index < content.data.length && content.data[op.index] === value ? op.index : content.data.indexOf(value);

          assert(
            `Mismatched Index: Expected index '${op.index}' to contain the value '${value.lid}' but that value is at index '${index}'`,
            op.index < content.data.length && content.data[op.index] === value
          );

          if (index !== -1) {
            // we remove the first occurrence of the value
            shouldNotify = true;
            content.data.splice(index, 1);
          }
        } else {
          // we remove the first occurrence of the value
          const index = content.data.indexOf(value);
          if (index !== -1) {
            shouldNotify = true;
            content.data.splice(index, 1);
          }
        }
      }
    }

    // notify
    if (shouldNotify) cache._capabilities.notifyChange(op.record, 'updated', null);
  } else {
    asDoc<ResourceDataDocument>(content);
    content.included = content.included || [];

    assert(`Expected to have a non-null operation value`, op.value);
    const toRemove = Array.isArray(op.value) ? op.value : [op.value];
    for (const identifier of toRemove) {
      assert(
        `attempted to remove a value from included that was not present in the included array`,
        content.included.includes(identifier)
      );
      const index = content.included.indexOf(identifier);
      assert(
        `The value '${identifier.lid}' cannot be removed from the included of document '${op.record.lid}' as it is not present`,
        index !== -1
      );
      if (index !== -1) {
        content.included.splice(index, 1);
      }
    }

    // we don't notify in the included case because this is not reactively
    // exposed. We should possibly consider doing so though for subscribers
  }
}

function areAllModelsUnloaded(wrapper: CacheCapabilitiesManager, identifiers: ResourceKey[]): boolean {
  for (let i = 0; i < identifiers.length; ++i) {
    const identifier = identifiers[i];
    if (wrapper.hasRecord(identifier)) {
      return false;
    }
  }
  return true;
}

function getLocalState(rel: CollectionEdge | ResourceEdge): ResourceKey[] {
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

function schemaHasLegacyDefaultValueFn(schema: Exclude<CacheableFieldSchema, IdentityField> | undefined): boolean {
  if (!schema) return false;
  return hasLegacyDefaultValueFn(schema.options);
}

function hasLegacyDefaultValueFn(options: object | undefined): options is { defaultValue: () => Value } {
  return !!options && typeof (options as { defaultValue: () => Value }).defaultValue === 'function';
}

function getDefaultValue(
  schema: Exclude<CacheableFieldSchema, IdentityField> | undefined,
  identifier: ResourceKey,
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
  if (hasLegacyDefaultValueFn(options)) {
    // If anyone opens an issue for args not working right, we'll restore + deprecate it via a Proxy
    // that lazily instantiates the record. We don't want to provide any args here
    // because in a non @ember-data/model world they don't make sense.
    return options.defaultValue();
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
    const transform = store.schema.transformation(schema);

    if (transform?.defaultValue) {
      return transform.defaultValue((options as ObjectValue) || null, identifier);
    }
  }
}

/**
 * The first layer, in the given resolution order, that holds `key`. Presence is `in`, so a value
 * explicitly set to `undefined` counts as present.
 */
function layerHolding(key: string, layers: Layered, order: readonly (AttrLayer | MergeLayer)[]): AttrHash | null {
  for (let i = 0; i < order.length; i++) {
    const layer = layers[order[i]];
    if (layer && key in layer) return layer;
  }
  return null;
}

/**
 * What the projection with the given resolution order reads for `attr`. A path resolves its first
 * segment through the layers and follows the rest into the value, stopping with `undefined` at the
 * first missing link.
 */
function resolveAttr(
  attr: string | string[],
  layers: Layered,
  order: readonly (AttrLayer | MergeLayer)[]
): Value | undefined {
  const key = typeof attr === 'string' ? attr : attr[0];
  const layer = layerHolding(key, layers, order);
  if (!layer) return undefined;

  return typeof attr === 'string' ? layer[key] : valueAtPath(layer[key], attr);
}

/** Follow `path` (from its second segment) into `base`, stopping with `undefined` at the first missing link or `null`. */
function valueAtPath(base: Value | undefined, path: string[]): Value | undefined {
  let current = base;
  for (let i = 1; i < path.length; i++) {
    if (current === undefined || current === null) return undefined;
    current = (current as ObjectValue)[path[i]];
  }
  return current;
}

/**
 * Whether two values of `field` count as the same value for change detection.
 *
 * A `schema-object`, and each element of a `schema-array`, compares by the identity hash its
 * `ObjectSchema` declares (`identity: { kind: '@hash', ... }`), so the schema decides what "same"
 * means for it. With no hash declared, and for every other field kind, only the same reference
 * counts. That knowingly over-notifies for equal-content objects: content equality is the schema's
 * to define, not the cache's to guess.
 */
function attrValuesEqual(
  schema: SchemaService,
  field: FieldSchema,
  a: Value | undefined,
  b: Value | undefined
): boolean {
  if (a === b) return true;
  if (field.kind === 'schema-object') return schemaObjectsEqual(schema, field, a, b);
  if (field.kind === 'schema-array') return schemaArraysEqual(schema, field, a, b);
  return false;
}

/**
 * A schema-array has no hash of its own: two arrays are the same when they have the same length
 * and every element compares equal as a schema-object of the element type.
 */
function schemaArraysEqual(schema: SchemaService, field: SchemaArrayField, a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!schemaObjectsEqual(schema, field, a[i], b[i])) return false;
  }
  return true;
}

function schemaObjectsEqual(
  schema: SchemaService,
  field: SchemaObjectField | SchemaArrayField,
  a: unknown,
  b: unknown
): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ia = fieldValueIdentity(schema, field, a);
  const ib = fieldValueIdentity(schema, field, b);
  return ia !== null && ib !== null && ia.type === ib.type && ia.hash !== null && ia.hash === ib.hash;
}

/**
 * Whether a nested edit's local clone is back to the baseline, so the edit can end. The schema
 * decides first, through {@link attrValuesEqual}: a schema-object with an identity hash matches
 * when its hash does. A value with no schema-defined equality falls back to comparing serialized
 * content, as this path always has: the clone began as a copy of the baseline, so key order
 * agrees while edits only replace existing keys. Anything that cannot serialize counts as still
 * edited, so no edit the cache cannot understand is thrown away.
 */
function localCloneMatchesBaseline(
  schema: SchemaService,
  field: FieldSchema | undefined,
  baseline: Value | undefined,
  clone: Value | undefined
): boolean {
  if (field && attrValuesEqual(schema, field, baseline, clone)) return true;
  if (!baseline || !clone) return false;
  try {
    return JSON.stringify(baseline) === JSON.stringify(clone);
  } catch {
    return false;
  }
}

/**
 * Which projection each changed key moved in, so the caller can notify on the matching channel:
 * `localOnly` and `remoteOnly` on theirs, `both` unscoped.
 *
 * `undefined` rather than empty Sets: this runs on every `upsert`, and a resource where nothing
 * moved should cost no allocation.
 */
interface ProjectionChanges {
  localOnly: Set<string> | undefined;
  remoteOnly: Set<string> | undefined;
  both: Set<string> | undefined;
}

const NO_PROJECTION_CHANGES: ProjectionChanges = Object.freeze({
  localOnly: undefined,
  remoteOnly: undefined,
  both: undefined,
});

/** The layers a merge reads: the resource's own, plus the attributes arriving from the server. */
function layersForMerge(cached: CachedResource, incomingAttrs: AttrHash | null): Layered {
  return {
    localAttrs: cached.localAttrs,
    inflightAttrs: cached.inflightAttrs,
    remoteAttrs: cached.remoteAttrs,
    defaultAttrs: cached.defaultAttrs,
    incomingAttrs,
  };
}

/**
 * Every key a merge could move: every key in every layer the after-merge order folds into
 * `remoteAttrs`. `null` when there is nothing to examine.
 */
function candidateKeys(layers: Layered, remoteAfterOrder: readonly (AttrLayer | MergeLayer)[]): string[] | null {
  let keys: string[] | null = null;
  for (let i = 0; i < remoteAfterOrder.length; i++) {
    const layer = remoteAfterOrder[i];
    if (layer === 'remoteAttrs') break;
    const hash = layers[layer];
    if (!hash) continue;
    const layerKeys = Object.keys(hash);
    if (!layerKeys.length) continue;
    if (keys === null) {
      keys = layerKeys;
      continue;
    }
    for (let j = 0; j < layerKeys.length; j++) {
      if (!keys.includes(layerKeys[j])) keys.push(layerKeys[j]);
    }
  }
  return keys;
}

/**
 * Fold every layer above `remoteAttrs` in the after-merge order for `kind` into `remoteAttrs`,
 * lowest precedence first, and clear each resource layer that was folded in. The same order
 * {@link partitionChangedKeys} used to predict the result, so the two cannot disagree.
 *
 * Reads the resource layers off `cached` rather than taking a {@link Layered}, so an upsert that
 * is not calculating changes allocates nothing beyond the merge itself.
 */
function mergeIntoRemote(cached: CachedResource, incomingAttrs: AttrHash | null, kind: MergeKind): void {
  const folded = MERGE_RESOLUTION[kind].folded;
  const target = cached.remoteAttrs || (Object.create(null) as AttrHash);
  for (let i = 0; i < folded.length; i++) {
    const layer = folded[i];
    const hash = layer === 'incomingAttrs' ? incomingAttrs : cached[layer];
    if (!hash) continue;
    Object.assign(target, hash);
    if (layer !== 'incomingAttrs') cached[layer] = null;
    // a field that now has a persisted value no longer needs its memoized default
    if (cached.defaultAttrs) dropMemoizedDefaults(cached.defaultAttrs, hash);
  }
  cached.remoteAttrs = target;
}

function dropMemoizedDefaults(defaultAttrs: AttrHash, replacedBy: AttrHash): void {
  const keys = Object.keys(replacedBy);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] in defaultAttrs) delete defaultAttrs[keys[i]];
  }
}

/**
 * Partition the keys a merge touches by which projection each one moves in. Must run *before*
 * {@link mergeIntoRemote}: it reads the pre-merge layers from `layers` and predicts the merge with
 * the same `RESOLUTION_ORDER_*_AFTER_*` orders `mergeIntoRemote` applies.
 */
function partitionChangedKeys(
  schema: SchemaService,
  layers: Layered,
  fields: ReturnType<Store['schema']['fields']>,
  kind: MergeKind
): ProjectionChanges {
  const { remoteAfter: remoteAfterOrder, localAfter: localAfterOrder } = MERGE_RESOLUTION[kind];
  const keys = candidateKeys(layers, remoteAfterOrder);
  if (keys === null) return NO_PROJECTION_CHANGES;

  let localOnly: Set<string> | undefined;
  let remoteOnly: Set<string> | undefined;
  let both: Set<string> | undefined;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    // relationship data that arrives inside `attributes` lives in the graph, not in `remoteAttrs`
    const field = fields.get(key);
    if (!field || isRelationship(field)) continue;

    const remoteBefore = resolveAttr(key, layers, RESOLUTION_ORDER_REMOTE_STATE);
    const remoteAfter = resolveAttr(key, layers, remoteAfterOrder);
    const localBefore = resolveAttr(key, layers, RESOLUTION_ORDER_LOCAL_STATE);
    const localAfter = resolveAttr(key, layers, localAfterOrder);

    const remoteMoved = !attrValuesEqual(schema, field, remoteBefore, remoteAfter);
    const localMoved = !attrValuesEqual(schema, field, localBefore, localAfter);

    if (remoteMoved && localMoved) {
      (both ??= new Set<string>()).add(key);
    } else if (remoteMoved) {
      (remoteOnly ??= new Set<string>()).add(key);
    } else if (localMoved) {
      (localOnly ??= new Set<string>()).add(key);
    }
  }

  return both || remoteOnly || localOnly ? { localOnly, remoteOnly, both } : NO_PROJECTION_CHANGES;
}

function notifyProjectionChanges(
  cache: JSONAPICache,
  identifier: ResourceKey,
  { both, remoteOnly, localOnly }: ProjectionChanges
): void {
  // one notify per set rather than per key: a document push runs this once per resource
  if (both?.size) cache._capabilities.notifyChange(identifier, 'attributes', both);
  if (remoteOnly?.size) cache._capabilities.notifyChange(identifier, 'attributes', remoteOnly, 'remote');
  if (localOnly?.size) cache._capabilities.notifyChange(identifier, 'attributes', localOnly, 'local');
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
  identifier: ResourceKey
): boolean {
  assertPrivateCapabilities(capabilities);
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
  fields: ReturnType<Store['schema']['fields']>,
  identifier: ResourceKey,
  data: ExistingResourceObject
) {
  for (const name in data.relationships!) {
    const relationshipData = data.relationships[name];
    const field = fields.get(name);
    // TODO consider asserting if the relationship is not in the schema
    // we intentionally ignore relationships that are not in the schema
    if (!relationshipData || !field || !isRelationship(field)) continue;

    graph.push({
      op: 'updateRelationship',
      record: identifier,
      field: name,
      value: relationshipData,
    });
  }
}

function isRelationship(field: FieldSchema): field is LegacyRelationshipField | CollectionField | ResourceField {
  const { kind } = field;
  return isRelationshipKind(kind);
}

/**
 * After a merge: drop every local edit the new baseline agrees with, by the same equality
 * {@link partitionChangedKeys} uses. Returns whether any edit was dropped.
 */
function reconcileLocalEdits(
  schema: SchemaService,
  cached: CachedResource,
  fields: ReturnType<Store['schema']['fields']>
): boolean {
  const { localAttrs, defaultAttrs } = cached;
  if (!localAttrs) {
    return false;
  }
  let droppedAnEdit = false;
  const editedKeys = Object.keys(localAttrs);

  for (let i = 0; i < editedKeys.length; i++) {
    const key = editedKeys[i];
    const field = fields.get(key);
    const baseline = resolveAttr(key, cached, RESOLUTION_ORDER_EDIT_BASELINE);

    if (field ? attrValuesEqual(schema, field, baseline, localAttrs[key]) : baseline === localAttrs[key]) {
      droppedAnEdit = true;
      delete localAttrs[key];
    }

    if (defaultAttrs && key in defaultAttrs) {
      delete defaultAttrs[key];
    }
  }
  return droppedAnEdit;
}

function asDoc<T extends ResourceDocument>(doc: unknown): asserts doc is T {}
function asOp<T extends Op>(doc: unknown): asserts doc is T {}

function putOne(
  cache: JSONAPICache,
  identifiers: CacheKeyManager,
  resource: ExistingResourceObject
): PersistedResourceKey {
  assert(
    `You must include an 'id' for the resource data ${resource.type}`,
    resource.id !== null && resource.id !== undefined && resource.id !== ''
  );
  assert(
    `Missing Resource Type: received resource data with a type '${resource.type}' but no schema could be found with that name.`,
    cache._capabilities.schema.hasResource(resource)
  );
  let identifier: ResourceKey | undefined = identifiers.peekResourceKey(resource);

  if (identifier) {
    identifier = identifiers.updateRecordIdentifier(identifier, resource);
  } else {
    identifier = identifiers.getOrCreateRecordIdentifier(resource);
  }
  cache.upsert(identifier, resource, cache._capabilities.hasRecord(identifier));
  // even if the identifier was not "existing" before, it is now
  return identifier as PersistedResourceKey;
}

/*
    Iterates over the set of internal models reachable from `this` across exactly one
    relationship.
  */
function _directlyRelatedIdentifiersIterable(storeWrapper: CacheCapabilitiesManager, originating: ResourceKey) {
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

  const findNext = (): ResourceKey | undefined => {
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
        next: (): { value: ResourceKey | undefined; done: boolean } => {
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
function _allRelatedIdentifiers(storeWrapper: CacheCapabilitiesManager, originating: ResourceKey): ResourceKey[] {
  const array: ResourceKey[] = [];
  const queue: ResourceKey[] = [];
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

function cacheUpsert(
  cache: JSONAPICache,
  identifier: ResourceKey,
  data: ExistingResourceObject,
  calculateChanges?: boolean
) {
  let changes: ProjectionChanges = NO_PROJECTION_CHANGES;
  const peeked = cache.__safePeek(identifier, false);
  const existed = !!peeked;
  const cached = peeked || cache._createCache(identifier);

  const isLoading = /*#__NOINLINE__*/ _isLoading(peeked, cache._capabilities, identifier) || !recordIsLoaded(peeked);
  const isUpdate = /*#__NOINLINE__*/ !_isEmpty(peeked) && !isLoading;

  if (LOG_CACHE) {
    logGroup(
      'cache',
      'upsert',
      identifier.type,
      identifier.lid,
      existed ? 'merged' : 'inserted',
      calculateChanges ? 'has-subscription' : ''
    );
    try {
      const _data = JSON.parse(JSON.stringify(data)) as object;

      // oxlint-disable-next-line no-console
      console.log(_data);
    } catch {
      // oxlint-disable-next-line no-console
      console.log(data);
    }
  }

  if (cached.isNew) {
    cached.isNew = false;
    cache._capabilities.notifyChange(identifier, 'identity', null);
    cache._capabilities.notifyChange(identifier, 'state', null);
  }

  const fields = getCacheFields(cache, identifier);

  // if no cache entry existed, no record exists / property has been accessed
  // and thus we do not need to notify changes to any properties.
  if (calculateChanges && existed && data.attributes) {
    // before the merge below, which overwrites the values the comparison reads
    changes = partitionChangedKeys(
      cache._capabilities.schema,
      layersForMerge(cached, data.attributes),
      fields,
      'upsert'
    );
  }
  mergeIntoRemote(cached, data.attributes ?? null, 'upsert');

  if (cached.localAttrs) {
    if (reconcileLocalEdits(cache._capabilities.schema, cached, fields)) {
      cache._capabilities.notifyChange(identifier, 'state', null);
    }
  }

  if (!isUpdate) {
    cache._capabilities.notifyChange(identifier, 'added', null);
  }

  if (data.id) {
    cached.id = data.id;
  }

  if (data.relationships) {
    setupRelationships(cache.__graph, fields, identifier, data);
  }

  assert(
    'An upsert merges nothing into remote state, so no key can move in the local projection alone',
    !changes.localOnly?.size
  );
  notifyProjectionChanges(cache, identifier, changes);

  if (LOG_CACHE) {
    // oxlint-disable-next-line no-console
    console.groupEnd();
  }

  return remoteChangedKeys(changes);
}

/** Every key whose remote value moved, as the `upsert` return value. */
function remoteChangedKeys({ both, remoteOnly }: ProjectionChanges): string[] | undefined {
  if (!both?.size) return remoteOnly?.size ? Array.from(remoteOnly) : undefined;
  const keys = Array.from(both);
  if (remoteOnly?.size) keys.push(...remoteOnly);
  return keys;
}

function patchCache(Cache: JSONAPICache, op: Operation): void {
  const isRecord = isResourceKey(op.record);
  const isDocument = !isRecord && isRequestKey(op.record);

  assert(`Expected Cache.patch op.record to be a record or document identifier`, isRecord || isDocument);

  if (LOG_CACHE) {
    logGroup(
      'cache',
      'patch',
      isRecord ? (op.record as ResourceKey).type : '<@document>',
      op.record.lid,
      op.op,
      'field' in op ? op.field : op.op === 'mergeIdentifiers' ? op.value.lid : ''
    );
    try {
      const _data = JSON.parse(JSON.stringify(op)) as object;
      // oxlint-disable-next-line no-console
      console.log(_data);
    } catch {
      // oxlint-disable-next-line no-console
      console.log(op);
    }
  }

  switch (op.op) {
    case 'mergeIdentifiers': {
      const cache = Cache.__cache.get(op.record);
      if (cache) {
        Cache.__cache.set(op.value, cache);
        Cache.__cache.delete(op.record);
      }
      Cache.__graph.update(op, true);
      break;
    }
    case 'update': {
      if (isRecord) {
        if ('field' in op) {
          const field = getCacheFields(Cache, op.record).get(op.field);
          assert(`Expected ${op.field} to be a field on ${op.record.type}`, field);
          if (isRelationship(field)) {
            asOp<UpdateResourceRelationshipOperation>(op);
            Cache.__graph.push(op);
          } else {
            asOp<UpdateResourceFieldOperation>(op);
            Cache.upsert(
              op.record,
              {
                type: op.record.type,
                id: op.record.id,
                attributes: {
                  [op.field]: op.value,
                },
              },
              Cache._capabilities.hasRecord(op.record)
            );
          }
        } else {
          asOp<UpdateResourceOperation>(op);
          Cache.upsert(op.record, op.value, Cache._capabilities.hasRecord(op.record));
        }
      } else {
        assert(`Update operations on documents is not supported`, false);
      }
      break;
    }
    case 'add': {
      if (isRecord) {
        if ('field' in op) {
          asOp<AddToResourceRelationshipOperation>(op);
          Cache.__graph.push(op);
        } else {
          asOp<AddResourceOperation>(op);
          Cache.upsert(op.record, op.value, Cache._capabilities.hasRecord(op.record));
        }
      } else {
        assert(`Expected a field in the add operation`, 'field' in op);
        asOp<AddToDocumentOperation>(op);
        addResourceToDocument(Cache, op);
      }
      break;
    }
    case 'remove': {
      if (isRecord) {
        if ('field' in op) {
          asOp<RemoveFromResourceRelationshipOperation>(op);
          Cache.__graph.push(op);
        } else {
          asOp<RemoveResourceOperation>(op);
          const cached = Cache.__safePeek(op.record, false);
          if (cached) {
            cached.isDeleted = true;
            cached.isDeletionCommitted = true;
            Cache.unloadRecord(op.record);
          } else {
            peekGraph(Cache._capabilities)?.push({
              op: 'deleteRecord',
              record: op.record,
              isNew: false,
            });
          }
        }
      } else {
        if ('field' in op) {
          assert(`Expected a field in the remove operation`, 'field' in op);

          asOp<RemoveFromDocumentOperation>(op);
          removeResourceFromDocument(Cache, op);
        } else {
          asOp<RemoveDocumentOperation>(op);
          // TODO @runspired teardown associated state ... notify subscribers etc.
          // This likely means that the instance cache needs to handle
          // holding onto reactive documents instead of the CacheHandler
          // and use a subscription to remove them.
          // Cache.__documents.delete(op.record.lid);
          assert(`Removing documents from the cache is not yet supported`, false);
        }
      }
      break;
    }
    default:
      assert(`Unhandled cache.patch operation ${(op as unknown as Op).op}`);
  }

  if (LOG_CACHE) {
    // oxlint-disable-next-line no-console
    console.groupEnd();
  }
}

function getCacheFields(
  cache: JSONAPICache,
  identifier: ResourceKey
): Map<string, Exclude<CacheableFieldSchema, IdentityField>> {
  if (cache._capabilities.schema.cacheFields) {
    const result = cache._capabilities.schema.cacheFields(identifier);
    if (result) {
      return result;
    }
  }

  // the model schema service cannot process fields that are not cache fields
  return cache._capabilities.schema.fields(identifier) as unknown as Map<
    string,
    Exclude<CacheableFieldSchema, IdentityField>
  >;
}

function commitDidError(cache: JSONAPICache, identifier: ResourceKey, errors: ApiError[] | null): void {
  const cached = cache.__peek(identifier, false);
  if (cached.inflightAttrs) {
    const keys = Object.keys(cached.inflightAttrs);
    if (keys.length > 0) {
      const attrs = (cached.localAttrs =
        cached.localAttrs || (Object.create(null) as Record<string, Value | undefined>));
      for (let i = 0; i < keys.length; i++) {
        if (!(keys[i] in attrs)) {
          attrs[keys[i]] = cached.inflightAttrs[keys[i]];
        }
      }
    }
    cached.inflightAttrs = null;
  }
  // the failed save's values are local edits again: drop any that now match remote
  if (reconcileLocalEdits(cache._capabilities.schema, cached, getCacheFields(cache, identifier))) {
    cache._capabilities.notifyChange(identifier, 'state', null);
  }
  if (errors) {
    cached.errors = errors;
  }
  cache._capabilities.notifyChange(identifier, 'errors', null);
}

function didCommit(
  cache: JSONAPICache,
  committedIdentifier: ResourceKey,
  data: ExistingResourceObject | null,
  op: string | null
): void {
  if (!data) {
    assert(
      `Your ${committedIdentifier.type} record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response.`,
      committedIdentifier.id
    );
  }

  const { cacheKeyManager } = cache._capabilities;
  const existingId = committedIdentifier.id;
  const identifier: ResourceKey =
    op !== 'deleteRecord' && data
      ? cacheKeyManager.updateRecordIdentifier(committedIdentifier, data)
      : committedIdentifier;

  const cached = cache.__peek(identifier, false);
  if (cached.isDeleted || op === 'deleteRecord') {
    cache.__graph.push({
      op: 'deleteRecord',
      record: identifier,
      isNew: false,
    });
    cached.isDeleted = true;
    cached.isDeletionCommitted = true;
    cache._capabilities.notifyChange(identifier, 'removed', null);
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

  const fields = getCacheFields(cache, identifier);
  cached.isNew = false;
  let responseAttrs: AttrHash | null = null;
  if (data) {
    if (data.id && !cached.id) {
      cached.id = data.id;
    }
    if (identifier === committedIdentifier && identifier.id !== existingId) {
      cache._capabilities.notifyChange(identifier, 'identity', null);
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
          fields.forEach((field, name) => {
            if (isSingleKind(field.kind)) {
              const relationshipData = data.relationships![name]?.data;
              if (relationshipData !== undefined) {
                const inFlightData = cached.inflightRelationships?.[name] as SingleResourceRelationship;
                if (!inFlightData || !('data' in inFlightData)) {
                  return;
                }
                const actualData = relationshipData
                  ? cache._capabilities.cacheKeyManager.getOrCreateRecordIdentifier(relationshipData)
                  : null;
                assert(
                  `Expected the resource relationship '<${identifier.type}>.${name}' on ${
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
      setupRelationships(cache.__graph, fields, identifier, data);
    }
    responseAttrs = data.attributes ?? null;
  }
  // before the merge below, which overwrites the values the comparison reads
  const changes = partitionChangedKeys(
    cache._capabilities.schema,
    layersForMerge(cached, responseAttrs),
    fields,
    'commit'
  );
  mergeIntoRemote(cached, responseAttrs, 'commit');
  reconcileLocalEdits(cache._capabilities.schema, cached, fields);

  if (cached.errors) {
    cached.errors = null;
    cache._capabilities.notifyChange(identifier, 'errors', null);
  }

  notifyProjectionChanges(cache, identifier, changes);
  cache._capabilities.notifyChange(identifier, 'state', null);
}

function willCommit(cache: JSONAPICache, identifier: ResourceKey): void {
  const cached = cache.__peek(identifier, false);

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
      const fields = getCacheFields(cache, identifier);
      fields.forEach((schema, name) => {
        if (isSingleKind(schema.kind)) {
          if (cache.__graph._isDirty(identifier, name)) {
            const relationshipData = cache.__graph.getData(identifier, name);
            const inFlight = (cached.inflightRelationships =
              cached.inflightRelationships || (Object.create(null) as Record<string, unknown>));
            inFlight[name] = relationshipData;
          }
        }
      });
    }
  }
}
