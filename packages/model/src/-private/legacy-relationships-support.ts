import { assert } from '@ember/debug';

import { importSync } from '@embroider/macros';

import type { UpgradedMeta } from '@ember-data/graph/-private/-edge-definition';
import type { CollectionEdge } from '@ember-data/graph/-private/edges/collection';
import type { ResourceEdge } from '@ember-data/graph/-private/edges/resource';
import type { Graph, GraphEdge } from '@ember-data/graph/-private/graph';
import { upgradeStore } from '@ember-data/legacy-compat/-private';
import { HAS_JSON_API_PACKAGE } from '@ember-data/packages';
import type Store from '@ember-data/store';
import {
  fastPush,
  isStableIdentifier,
  peekCache,
  recordIdentifierFor,
  SOURCE,
  storeFor,
} from '@ember-data/store/-private';
import type { Cache } from '@ember-data/store/-types/q/cache';
import type { JsonApiRelationship } from '@ember-data/store/-types/q/record-data-json-api';
import type { OpaqueRecordInstance } from '@ember-data/store/-types/q/record-instance';
import type { BaseFinderOptions } from '@ember-data/store/-types/q/store';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import type { LocalRelationshipOperation } from '@warp-drive/core-types/graph';
import type { CollectionResourceRelationship, SingleResourceRelationship } from '@warp-drive/core-types/spec/raw';

import type { ManyArray } from '../-private';
import RelatedCollection from './many-array';
import type { MinimalLegacyRecord } from './model-methods';
import type { BelongsToProxyCreateArgs, BelongsToProxyMeta } from './promise-belongs-to';
import { PromiseBelongsTo } from './promise-belongs-to';
import type { HasManyProxyCreateArgs } from './promise-many-array';
import PromiseManyArray from './promise-many-array';
import BelongsToReference from './references/belongs-to';
import HasManyReference from './references/has-many';

type PromiseBelongsToFactory<T = unknown> = { create(args: BelongsToProxyCreateArgs<T>): PromiseBelongsTo<T> };

export const LEGACY_SUPPORT: Map<StableRecordIdentifier | MinimalLegacyRecord, LegacySupport> = new Map();

export function lookupLegacySupport(record: MinimalLegacyRecord): LegacySupport {
  const identifier = recordIdentifierFor(record);
  assert(`Expected a record`, identifier);
  let support = LEGACY_SUPPORT.get(identifier);

  if (!support) {
    assert(`Memory Leak Detected`, !record.isDestroyed && !record.isDestroying);
    support = new LegacySupport(record);
    LEGACY_SUPPORT.set(identifier, support);
    LEGACY_SUPPORT.set(record, support);
  }

  return support;
}

export class LegacySupport {
  declare record: MinimalLegacyRecord;
  declare store: Store;
  declare graph: Graph;
  declare cache: Cache;
  declare references: Record<string, BelongsToReference | HasManyReference>;
  declare identifier: StableRecordIdentifier;
  declare _manyArrayCache: Record<string, RelatedCollection>;
  declare _relationshipPromisesCache: Record<string, Promise<RelatedCollection | OpaqueRecordInstance>>;
  declare _relationshipProxyCache: Record<string, PromiseManyArray | PromiseBelongsTo | undefined>;
  declare _pending: Record<string, Promise<StableRecordIdentifier | null> | undefined>;

  declare isDestroying: boolean;
  declare isDestroyed: boolean;

  constructor(record: MinimalLegacyRecord) {
    this.record = record;
    this.store = storeFor(record)!;
    this.identifier = recordIdentifierFor(record);
    this.cache = peekCache(record);

    if (HAS_JSON_API_PACKAGE) {
      const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
        .graphFor;

      this.graph = graphFor(this.store);
    }

    this._manyArrayCache = Object.create(null) as Record<string, RelatedCollection>;
    this._relationshipPromisesCache = Object.create(null) as Record<
      string,
      Promise<RelatedCollection | OpaqueRecordInstance>
    >;
    this._relationshipProxyCache = Object.create(null) as Record<string, PromiseManyArray | PromiseBelongsTo>;
    this._pending = Object.create(null) as Record<string, Promise<StableRecordIdentifier | null>>;
    this.references = Object.create(null) as Record<string, BelongsToReference>;
  }

  _syncArray(array: RelatedCollection) {
    // It’s possible the parent side of the relationship may have been destroyed by this point
    if (this.isDestroyed || this.isDestroying) {
      return;
    }
    const currentState = array[SOURCE];
    const identifier = this.identifier;

    const [identifiers, jsonApi] = this._getCurrentState(identifier, array.key);

    if (jsonApi.meta) {
      array.meta = jsonApi.meta;
    }

    if (jsonApi.links) {
      array.links = jsonApi.links;
    }

    currentState.length = 0;
    fastPush(currentState, identifiers);
  }

  mutate(mutation: LocalRelationshipOperation): void {
    this.cache.mutate(mutation);
  }

  _findBelongsTo(
    key: string,
    resource: SingleResourceRelationship,
    relationship: ResourceEdge,
    options?: BaseFinderOptions
  ): Promise<OpaqueRecordInstance | null> {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    // TODO @runspired follow up on whether this should be in the relationship requests cache
    return this._findBelongsToByJsonApiResource(resource, this.identifier, relationship, options).then(
      (identifier: StableRecordIdentifier | null) =>
        handleCompletedRelationshipRequest(this, key, relationship, identifier),
      (e: Error) => handleCompletedRelationshipRequest(this, key, relationship, null, e)
    );
  }

  reloadBelongsTo(key: string, options?: BaseFinderOptions): Promise<OpaqueRecordInstance | null> {
    const loadingPromise = this._relationshipPromisesCache[key] as Promise<OpaqueRecordInstance | null> | undefined;
    if (loadingPromise) {
      return loadingPromise;
    }

    const relationship = this.graph.get(this.identifier, key);
    assert(`Expected ${key} to be a belongs-to relationship`, isBelongsTo(relationship));

    const resource = this.cache.getRelationship(this.identifier, key) as SingleResourceRelationship;
    relationship.state.hasFailedLoadAttempt = false;
    relationship.state.shouldForceReload = true;
    const promise = this._findBelongsTo(key, resource, relationship, options);
    if (this._relationshipProxyCache[key]) {
      // @ts-expect-error
      return this._updatePromiseProxyFor('belongsTo', key, { promise });
    }
    return promise;
  }

  getBelongsTo(key: string, options?: BaseFinderOptions): PromiseBelongsTo | OpaqueRecordInstance | null {
    const { identifier, cache } = this;
    const resource = cache.getRelationship(this.identifier, key) as SingleResourceRelationship;
    const relatedIdentifier = resource && resource.data ? resource.data : null;
    assert(`Expected a stable identifier`, !relatedIdentifier || isStableIdentifier(relatedIdentifier));

    const store = this.store;
    const relationship = this.graph.get(this.identifier, key);
    assert(`Expected ${key} to be a belongs-to relationship`, isBelongsTo(relationship));

    const isAsync = relationship.definition.isAsync;
    const _belongsToState: BelongsToProxyMeta = {
      key,
      store,
      legacySupport: this,
      modelName: relationship.definition.type,
    };

    if (isAsync) {
      if (relationship.state.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key] as PromiseBelongsTo;
      }

      const promise = this._findBelongsTo(key, resource, relationship, options);
      const isLoaded = relatedIdentifier && store._instanceCache.recordIsLoaded(relatedIdentifier);

      return this._updatePromiseProxyFor('belongsTo', key, {
        promise,
        content: isLoaded ? store._instanceCache.getRecord(relatedIdentifier) : null,
        _belongsToState,
      });
    } else {
      if (relatedIdentifier === null) {
        return null;
      } else {
        const toReturn = store._instanceCache.getRecord(relatedIdentifier);
        assert(
          `You looked up the '${key}' relationship on a '${identifier.type}' with id ${
            identifier.id || 'null'
          } but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (\`belongsTo(<type>, { async: true, inverse: <inverse> })\`)`,
          toReturn === null || store._instanceCache.recordIsLoaded(relatedIdentifier, true)
        );
        return toReturn;
      }
    }
  }

  setDirtyBelongsTo(key: string, value: OpaqueRecordInstance | null) {
    return this.cache.mutate(
      {
        op: 'replaceRelatedRecord',
        record: this.identifier,
        field: key,
        value: extractIdentifierFromRecord(value),
      },
      // @ts-expect-error
      true
    );
  }

  _getCurrentState(
    identifier: StableRecordIdentifier,
    field: string
  ): [StableRecordIdentifier[], CollectionRelationship] {
    const jsonApi = this.cache.getRelationship(identifier, field) as CollectionRelationship;
    const cache = this.store._instanceCache;
    const identifiers: StableRecordIdentifier[] = [];
    if (jsonApi.data) {
      for (let i = 0; i < jsonApi.data.length; i++) {
        const relatedIdentifier: StableRecordIdentifier = jsonApi.data[i];
        assert(`Expected a stable identifier`, isStableIdentifier(relatedIdentifier));
        if (cache.recordIsLoaded(relatedIdentifier, true)) {
          identifiers.push(relatedIdentifier);
        }
      }
    }

    return [identifiers, jsonApi];
  }

  getManyArray<T>(key: string, definition?: UpgradedMeta): RelatedCollection<T> {
    if (HAS_JSON_API_PACKAGE) {
      let manyArray: RelatedCollection<T> | undefined = this._manyArrayCache[key] as RelatedCollection<T> | undefined;
      if (!definition) {
        definition = this.graph.get(this.identifier, key).definition;
      }

      if (!manyArray) {
        const [identifiers, doc] = this._getCurrentState(this.identifier, key);

        manyArray = new RelatedCollection({
          store: this.store,
          type: definition.type,
          identifier: this.identifier,
          cache: this.cache,
          identifiers,
          key,
          meta: doc.meta || null,
          links: doc.links || null,
          isPolymorphic: definition.isPolymorphic,
          isAsync: definition.isAsync,
          _inverseIsAsync: definition.inverseIsAsync,
          manager: this,
          isLoaded: !definition.isAsync,
          allowMutation: true,
        });
        this._manyArrayCache[key] = manyArray;
      }

      return manyArray;
    }
    assert('hasMany only works with the @ember-data/json-api package');
  }

  fetchAsyncHasMany(
    key: string,
    relationship: CollectionEdge,
    manyArray: RelatedCollection,
    options?: BaseFinderOptions
  ): Promise<RelatedCollection> {
    if (HAS_JSON_API_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key] as Promise<RelatedCollection> | undefined;
      if (loadingPromise) {
        return loadingPromise;
      }

      const jsonApi = this.cache.getRelationship(this.identifier, key) as CollectionRelationship;
      const promise = this._findHasManyByJsonApiResource(jsonApi, this.identifier, relationship, options);

      if (!promise) {
        manyArray.isLoaded = true;
        return Promise.resolve(manyArray);
      }

      loadingPromise = promise.then(
        () => handleCompletedRelationshipRequest(this, key, relationship, manyArray),
        (e: Error) => handleCompletedRelationshipRequest(this, key, relationship, manyArray, e)
      );
      this._relationshipPromisesCache[key] = loadingPromise;
      return loadingPromise;
    }
    assert('hasMany only works with the @ember-data/json-api package');
  }

  reloadHasMany<T>(key: string, options?: BaseFinderOptions): Promise<ManyArray<T>> | PromiseManyArray<T> {
    if (HAS_JSON_API_PACKAGE) {
      const loadingPromise = this._relationshipPromisesCache[key];
      if (loadingPromise) {
        return loadingPromise as Promise<ManyArray<T>>;
      }
      const relationship = this.graph.get(this.identifier, key) as CollectionEdge;
      const { definition, state } = relationship;

      state.hasFailedLoadAttempt = false;
      state.shouldForceReload = true;
      const manyArray = this.getManyArray(key, definition);
      const promise = this.fetchAsyncHasMany(key, relationship, manyArray, options);

      if (this._relationshipProxyCache[key]) {
        return this._updatePromiseProxyFor('hasMany', key, { promise }) as PromiseManyArray<T>;
      }

      return promise as Promise<ManyArray<T>>;
    }
    assert(`hasMany only works with the @ember-data/json-api package`);
  }

  getHasMany(key: string, options?: BaseFinderOptions): PromiseManyArray | RelatedCollection {
    if (HAS_JSON_API_PACKAGE) {
      const relationship = this.graph.get(this.identifier, key) as CollectionEdge;
      const { definition, state } = relationship;
      const manyArray = this.getManyArray(key, definition);

      if (definition.isAsync) {
        if (state.hasFailedLoadAttempt) {
          return this._relationshipProxyCache[key] as PromiseManyArray;
        }

        const promise = this.fetchAsyncHasMany(key, relationship, manyArray, options);

        return this._updatePromiseProxyFor('hasMany', key, { promise, content: manyArray });
      } else {
        assert(
          `You looked up the '${key}' relationship on a '${this.identifier.type}' with id ${
            this.identifier.id || 'null'
          } but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async ('hasMany(<type>, { async: true, inverse: <inverse> })')`,
          !anyUnloaded(this.store, relationship)
        );

        return manyArray;
      }
    }
    assert(`hasMany only works with the @ember-data/json-api package`);
  }

  _updatePromiseProxyFor(kind: 'hasMany', key: string, args: HasManyProxyCreateArgs): PromiseManyArray;
  _updatePromiseProxyFor(kind: 'belongsTo', key: string, args: BelongsToProxyCreateArgs): PromiseBelongsTo;
  _updatePromiseProxyFor(
    kind: 'belongsTo',
    key: string,
    args: { promise: Promise<OpaqueRecordInstance | null> }
  ): PromiseBelongsTo;
  _updatePromiseProxyFor(
    kind: 'hasMany' | 'belongsTo',
    key: string,
    args: BelongsToProxyCreateArgs | HasManyProxyCreateArgs | { promise: Promise<OpaqueRecordInstance | null> }
  ): PromiseBelongsTo | PromiseManyArray {
    let promiseProxy = this._relationshipProxyCache[key];
    if (kind === 'hasMany') {
      const { promise, content } = args as HasManyProxyCreateArgs;
      if (promiseProxy) {
        assert(`Expected a PromiseManyArray`, '_update' in promiseProxy);
        promiseProxy._update(promise, content);
      } else {
        promiseProxy = this._relationshipProxyCache[key] = new PromiseManyArray(promise, content);
      }
      return promiseProxy;
    }
    if (promiseProxy) {
      const { promise, content } = args as BelongsToProxyCreateArgs;
      assert(`Expected a PromiseBelongsTo`, '_belongsToState' in promiseProxy);

      if (content !== undefined) {
        promiseProxy.set('content', content);
      }
      void promiseProxy.set('promise', promise);
    } else {
      promiseProxy = (PromiseBelongsTo as unknown as PromiseBelongsToFactory).create(args as BelongsToProxyCreateArgs);
      this._relationshipProxyCache[key] = promiseProxy;
    }

    return promiseProxy;
  }

  referenceFor(kind: 'belongsTo', name: string): BelongsToReference;
  referenceFor(kind: 'hasMany', name: string): HasManyReference;
  referenceFor(kind: 'belongsTo' | 'hasMany', name: string) {
    let reference = this.references[name];

    if (!reference) {
      if (!HAS_JSON_API_PACKAGE) {
        // TODO @runspired while this feels odd, it is not a regression in capability because we do
        // not today support references pulling from RecordDatas other than our own
        // because of the intimate API access involved. This is something we will need to redesign.
        assert(`snapshot.belongsTo only supported for @ember-data/json-api`);
      }
      const { graph, identifier } = this;
      const relationship = graph.get(identifier, name);

      if (DEBUG) {
        if (kind) {
          const modelName = identifier.type;
          const actualRelationshipKind = relationship.definition.kind;
          assert(
            `You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`,
            actualRelationshipKind === kind
          );
        }
      }

      const relationshipKind = relationship.definition.kind;

      if (relationshipKind === 'belongsTo') {
        reference = new BelongsToReference(this.store, graph, identifier, relationship as ResourceEdge, name);
      } else if (relationshipKind === 'hasMany') {
        reference = new HasManyReference(this.store, graph, identifier, relationship as CollectionEdge, name);
      }

      this.references[name] = reference;
    }

    return reference;
  }

  _findHasManyByJsonApiResource(
    resource: CollectionResourceRelationship,
    parentIdentifier: StableRecordIdentifier,
    relationship: CollectionEdge,
    options: BaseFinderOptions = {}
  ): Promise<void | unknown[]> | void {
    if (HAS_JSON_API_PACKAGE) {
      if (!resource) {
        return;
      }
      const { definition, state } = relationship;
      upgradeStore(this.store);
      const adapter = this.store.adapterFor(definition.type);
      const { isStale, hasDematerializedInverse, hasReceivedData, isEmpty, shouldForceReload } = state;
      const allInverseRecordsAreLoaded = areAllInverseRecordsLoaded(this.store, resource);
      const identifiers = resource.data;
      const shouldFindViaLink =
        resource.links &&
        resource.links.related &&
        (typeof adapter.findHasMany === 'function' || typeof identifiers === 'undefined') &&
        (shouldForceReload || hasDematerializedInverse || isStale || (!allInverseRecordsAreLoaded && !isEmpty));

      const relationshipMeta = this.store
        .getSchemaDefinitionService()
        .relationshipsDefinitionFor({ type: definition.inverseType })[definition.key];

      const request = {
        useLink: shouldFindViaLink,
        field: relationshipMeta,
        links: resource.links,
        meta: resource.meta,
        options,
        record: parentIdentifier,
      };

      // fetch via link
      if (shouldFindViaLink) {
        assert(`Expected collection to be an array`, !identifiers || Array.isArray(identifiers));
        assert(`Expected stable identifiers`, !identifiers || identifiers.every(isStableIdentifier));

        return this.store.request({
          op: 'findHasMany',
          records: identifiers || [],
          data: request,
          cacheOptions: { [Symbol.for('wd:skip-cache')]: true },
        }) as unknown as Promise<void>;
      }

      const preferLocalCache = hasReceivedData && !isEmpty;
      const hasLocalPartialData =
        hasDematerializedInverse || (isEmpty && Array.isArray(identifiers) && identifiers.length > 0);
      const attemptLocalCache = !shouldForceReload && !isStale && (preferLocalCache || hasLocalPartialData);

      if (attemptLocalCache && allInverseRecordsAreLoaded) {
        return;
      }

      const hasData = hasReceivedData && !isEmpty;
      if (attemptLocalCache || hasData || hasLocalPartialData) {
        assert(`Expected collection to be an array`, Array.isArray(identifiers));
        assert(`Expected stable identifiers`, identifiers.every(isStableIdentifier));

        options.reload = options.reload || !attemptLocalCache || undefined;
        return this.store.request({
          op: 'findHasMany',
          records: identifiers,
          data: request,
          cacheOptions: { [Symbol.for('wd:skip-cache')]: true },
        }) as unknown as Promise<void>;
      }

      // we were explicitly told we have no data and no links.
      //   TODO if the relationshipIsStale, should we hit the adapter anyway?
      return;
    }
    assert(`hasMany only works with the @ember-data/json-api package`);
  }

  _findBelongsToByJsonApiResource(
    resource: SingleResourceRelationship,
    parentIdentifier: StableRecordIdentifier,
    relationship: ResourceEdge,
    options: BaseFinderOptions = {}
  ): Promise<StableRecordIdentifier | null> {
    if (!resource) {
      return Promise.resolve(null);
    }
    const key = relationship.definition.key;

    // interleaved promises mean that we MUST cache this here
    // in order to prevent infinite re-render if the request
    // fails.
    if (this._pending[key]) {
      return this._pending[key]!;
    }

    const identifier = resource.data ? resource.data : null;
    assert(`Expected a stable identifier`, !identifier || isStableIdentifier(identifier));

    const { isStale, hasDematerializedInverse, hasReceivedData, isEmpty, shouldForceReload } = relationship.state;

    const allInverseRecordsAreLoaded = areAllInverseRecordsLoaded(this.store, resource);
    const shouldFindViaLink =
      resource.links?.related &&
      (shouldForceReload || hasDematerializedInverse || isStale || (!allInverseRecordsAreLoaded && !isEmpty));

    const relationshipMeta = this.store.getSchemaDefinitionService().relationshipsDefinitionFor(this.identifier)[
      relationship.definition.key
    ];
    assert(`Attempted to access a belongsTo relationship but no definition exists for it`, relationshipMeta);
    const request = {
      useLink: shouldFindViaLink,
      field: relationshipMeta,
      links: resource.links,
      meta: resource.meta,
      options,
      record: parentIdentifier,
    };

    // fetch via link
    if (shouldFindViaLink) {
      const future = this.store.request<StableRecordIdentifier | null>({
        op: 'findBelongsTo',
        records: identifier ? [identifier] : [],
        data: request,
        cacheOptions: { [Symbol.for('wd:skip-cache')]: true },
      });
      this._pending[key] = future
        .then((doc) => doc.content)
        .finally(() => {
          this._pending[key] = undefined;
        });
      return this._pending[key]!;
    }

    const preferLocalCache = hasReceivedData && allInverseRecordsAreLoaded && !isEmpty;
    const hasLocalPartialData = hasDematerializedInverse || (isEmpty && resource.data);
    // null is explicit empty, undefined is "we don't know anything"
    const localDataIsEmpty = !identifier;
    const attemptLocalCache = !shouldForceReload && !isStale && (preferLocalCache || hasLocalPartialData);

    // we dont need to fetch and are empty
    if (attemptLocalCache && localDataIsEmpty) {
      return Promise.resolve(null);
    }

    // we dont need to fetch because we are local state
    const resourceIsLocal = identifier?.id === null;
    if ((attemptLocalCache && allInverseRecordsAreLoaded) || resourceIsLocal) {
      return Promise.resolve(identifier);
    }

    // we may need to fetch
    if (identifier) {
      assert(`Cannot fetch belongs-to relationship with no information`, identifier);
      options.reload = options.reload || !attemptLocalCache || undefined;

      this._pending[key] = this.store
        .request<StableRecordIdentifier | null>({
          op: 'findBelongsTo',
          records: [identifier],
          data: request,
          cacheOptions: { [Symbol.for('wd:skip-cache')]: true },
        })
        .then((doc) => doc.content)
        .finally(() => {
          this._pending[key] = undefined;
        });
      return this._pending[key]!;
    }

    // we were explicitly told we have no data and no links.
    //   TODO if the relationshipIsStale, should we hit the adapter anyway?
    return Promise.resolve(null);
  }

  destroy() {
    this.isDestroying = true;

    let cache: Record<string, { destroy(): void } | undefined> = this._manyArrayCache;
    this._manyArrayCache = Object.create(null) as Record<string, RelatedCollection>;
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
    });

    cache = this._relationshipProxyCache;
    this._relationshipProxyCache = Object.create(null) as Record<string, PromiseManyArray | PromiseBelongsTo>;
    Object.keys(cache).forEach((key) => {
      const proxy = cache[key]!;
      if (proxy.destroy) {
        proxy.destroy();
      }
    });

    cache = this.references;
    this.references = Object.create(null) as Record<string, BelongsToReference | HasManyReference>;
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
    });
    this.isDestroyed = true;
  }
}

function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: ResourceEdge,
  value: StableRecordIdentifier | null
): OpaqueRecordInstance | null;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: CollectionEdge,
  value: RelatedCollection
): RelatedCollection;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: ResourceEdge,
  value: null,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: CollectionEdge,
  value: RelatedCollection,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: ResourceEdge | CollectionEdge,
  value: RelatedCollection | StableRecordIdentifier | null,
  error?: Error
): RelatedCollection | OpaqueRecordInstance | null {
  delete recordExt._relationshipPromisesCache[key];
  relationship.state.shouldForceReload = false;
  const isHasMany = relationship.definition.kind === 'hasMany';

  if (isHasMany) {
    // we don't notify the record property here to avoid refetch
    // only the many array
    (value as RelatedCollection).notify();
  }

  if (error) {
    relationship.state.hasFailedLoadAttempt = true;
    const proxy = recordExt._relationshipProxyCache[key];
    // belongsTo relationships are sometimes unloaded
    // when a load fails, in this case we need
    // to make sure that we aren't proxying
    // to destroyed content
    // for the sync belongsTo reload case there will be no proxy
    // for the async reload case there will be no proxy if the ui
    // has never been accessed
    if (proxy && !isHasMany) {
      // @ts-expect-error unsure why this is not resolving the boolean but async belongsTo is weird
      if (proxy.content && proxy.content.isDestroying) {
        (proxy as PromiseBelongsTo).set('content', null);
      }
      recordExt.store.notifications._flush();
    }

    throw error;
  }

  if (isHasMany) {
    (value as RelatedCollection).isLoaded = true;
  } else {
    recordExt.store.notifications._flush();
  }

  relationship.state.hasFailedLoadAttempt = false;
  // only set to not stale if no error is thrown
  relationship.state.isStale = false;

  return isHasMany || !value ? value : recordExt.store.peekRecord(value as StableRecordIdentifier);
}

type PromiseProxyRecord = { then(): void; content: OpaqueRecordInstance | null | undefined };

function extractIdentifierFromRecord(record: PromiseProxyRecord | OpaqueRecordInstance | null) {
  if (!record) {
    return null;
  }

  return recordIdentifierFor(record);
}

function anyUnloaded(store: Store, relationship: CollectionEdge) {
  const graph = store._graph;
  assert(`Expected a Graph instance to be available`, graph);
  const relationshipData = graph.getData(
    relationship.identifier,
    relationship.definition.key
  ) as CollectionRelationship;
  const state = relationshipData.data;
  const cache = store._instanceCache;
  const unloaded = state?.find((s) => {
    const isLoaded = cache.recordIsLoaded(s, true);
    return !isLoaded;
  });

  return unloaded || false;
}

export function areAllInverseRecordsLoaded(store: Store, resource: JsonApiRelationship): boolean {
  const instanceCache = store._instanceCache;
  const identifiers = resource.data;

  if (Array.isArray(identifiers)) {
    assert(`Expected stable identifiers`, identifiers.every(isStableIdentifier));
    // treat as collection
    // check for unloaded records
    return identifiers.every((identifier: StableRecordIdentifier) => instanceCache.recordIsLoaded(identifier));
  }

  // treat as single resource
  if (!identifiers) return true;

  assert(`Expected stable identifiers`, isStableIdentifier(identifiers));
  return instanceCache.recordIsLoaded(identifiers);
}

function isBelongsTo(relationship: GraphEdge): relationship is ResourceEdge {
  return relationship.definition.kind === 'belongsTo';
}
