import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { importSync } from '@embroider/macros';
import { all, resolve } from 'rsvp';

import type { UpgradedMeta } from '@ember-data/graph/-private/graph/-edge-definition';
import type { LocalRelationshipOperation } from '@ember-data/graph/-private/graph/-operations';
import type { ImplicitRelationship } from '@ember-data/graph/-private/graph/index';
import type BelongsToRelationship from '@ember-data/graph/-private/relationships/state/belongs-to';
import type ManyRelationship from '@ember-data/graph/-private/relationships/state/has-many';
import { HAS_JSON_API_PACKAGE } from '@ember-data/private-build-infra';
import { DEPRECATE_PROMISE_PROXIES } from '@ember-data/private-build-infra/deprecations';
import type Store from '@ember-data/store';
import { fastPush, isStableIdentifier, recordIdentifierFor, SOURCE, storeFor } from '@ember-data/store/-private';
import type { NonSingletonCacheManager } from '@ember-data/store/-private/managers/cache-manager';
import type { Cache } from '@ember-data/types/q/cache';
import type { DSModel } from '@ember-data/types/q/ds-model';
import { CollectionResourceRelationship, SingleResourceRelationship } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { JsonApiRelationship } from '@ember-data/types/q/record-data-json-api';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import { _findBelongsTo, _findHasMany } from './legacy-data-fetch';
import { assertIdentifierHasId } from './legacy-data-utils';
import RelatedCollection from './many-array';
import type { BelongsToProxyCreateArgs, BelongsToProxyMeta } from './promise-belongs-to';
import PromiseBelongsTo from './promise-belongs-to';
import type { HasManyProxyCreateArgs } from './promise-many-array';
import PromiseManyArray from './promise-many-array';
import BelongsToReference from './references/belongs-to';
import HasManyReference from './references/has-many';

type PromiseBelongsToFactory = { create(args: BelongsToProxyCreateArgs): PromiseBelongsTo };

export class LegacySupport {
  declare record: DSModel;
  declare store: Store;
  declare recordData: Cache;
  declare references: Dict<BelongsToReference | HasManyReference>;
  declare identifier: StableRecordIdentifier;
  declare _manyArrayCache: Dict<RelatedCollection>;
  declare _relationshipPromisesCache: Dict<Promise<RelatedCollection | RecordInstance>>;
  declare _relationshipProxyCache: Dict<PromiseManyArray | PromiseBelongsTo>;

  declare isDestroying: boolean;
  declare isDestroyed: boolean;

  constructor(record: DSModel) {
    this.record = record;
    this.store = storeFor(record)!;
    this.identifier = recordIdentifierFor(record);
    this.recordData = this.store._instanceCache.getRecordData(this.identifier);

    this._manyArrayCache = Object.create(null) as Dict<RelatedCollection>;
    this._relationshipPromisesCache = Object.create(null) as Dict<Promise<RelatedCollection | RecordInstance>>;
    this._relationshipProxyCache = Object.create(null) as Dict<PromiseManyArray | PromiseBelongsTo>;
    this.references = Object.create(null) as Dict<BelongsToReference>;
  }

  _syncArray(array: RelatedCollection) {
    // It’s possible the parent side of the relationship may have been destroyed by this point
    if (this.isDestroyed || this.isDestroying) {
      return;
    }
    const currentState = array[SOURCE];
    const identifier = this.identifier;

    let [identifiers, jsonApi] = this._getCurrentState(identifier, array.key);

    if (jsonApi.meta) {
      array.meta = jsonApi.meta;
    }

    if (jsonApi.links) {
      array.links = jsonApi.links;
    }

    currentState.length = 0;
    fastPush(currentState, identifiers);
  }

  updateCache(operation: LocalRelationshipOperation): void {
    this.recordData.update(operation);
  }

  _findBelongsTo(
    key: string,
    resource: SingleResourceRelationship,
    relationship: BelongsToRelationship,
    options?: FindOptions
  ): Promise<RecordInstance | null> {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    // TODO @runspired follow up on whether this should be in the relationship requests cache
    return this._findBelongsToByJsonApiResource(resource, this.identifier, relationship, options).then(
      (identifier: StableRecordIdentifier | null) =>
        handleCompletedRelationshipRequest(this, key, relationship, identifier),
      (e: Error) => handleCompletedRelationshipRequest(this, key, relationship, null, e)
    );
  }

  reloadBelongsTo(key: string, options?: FindOptions): Promise<RecordInstance | null> {
    let loadingPromise = this._relationshipPromisesCache[key] as Promise<RecordInstance | null> | undefined;
    if (loadingPromise) {
      return loadingPromise;
    }

    const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private')).graphFor;
    const relationship = graphFor(this.store).get(this.identifier, key);
    assert(`Expected ${key} to be a belongs-to relationship`, isBelongsTo(relationship));

    let resource = this.recordData.getRelationship(this.identifier, key) as SingleResourceRelationship;
    relationship.state.hasFailedLoadAttempt = false;
    relationship.state.shouldForceReload = true;
    let promise = this._findBelongsTo(key, resource, relationship, options);
    if (this._relationshipProxyCache[key]) {
      return this._updatePromiseProxyFor('belongsTo', key, { promise });
    }
    return promise;
  }

  getBelongsTo(key: string, options?: FindOptions): PromiseBelongsTo | RecordInstance | null {
    const { identifier, recordData } = this;
    let resource = recordData.getRelationship(this.identifier, key) as SingleResourceRelationship;
    let relatedIdentifier = resource && resource.data ? resource.data : null;
    assert(`Expected a stable identifier`, !relatedIdentifier || isStableIdentifier(relatedIdentifier));

    const store = this.store;
    const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private')).graphFor;
    const relationship = graphFor(store).get(this.identifier, key);
    assert(`Expected ${key} to be a belongs-to relationship`, isBelongsTo(relationship));

    let isAsync = relationship.definition.isAsync;
    let _belongsToState: BelongsToProxyMeta = {
      key,
      store,
      legacySupport: this,
      modelName: relationship.definition.type,
    };

    if (isAsync) {
      if (relationship.state.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key] as PromiseBelongsTo;
      }

      let promise = this._findBelongsTo(key, resource, relationship, options);
      const isLoaded = relatedIdentifier && store._instanceCache.recordIsLoaded(relatedIdentifier);

      return this._updatePromiseProxyFor('belongsTo', key, {
        promise,
        content: isLoaded ? store._instanceCache.getRecord(relatedIdentifier!) : null,
        _belongsToState,
      });
    } else {
      if (relatedIdentifier === null) {
        return null;
      } else {
        let toReturn = store._instanceCache.getRecord(relatedIdentifier);
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

  setDirtyBelongsTo(key: string, value: RecordInstance | null) {
    return this.recordData.update(
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
  ): [StableRecordIdentifier[], CollectionResourceRelationship] {
    let jsonApi = (this.recordData as NonSingletonCacheManager).getRelationship(
      identifier,
      field,
      true
    ) as CollectionResourceRelationship;
    const cache = this.store._instanceCache;
    let identifiers: StableRecordIdentifier[] = [];
    if (jsonApi.data) {
      for (let i = 0; i < jsonApi.data.length; i++) {
        const identifier = jsonApi.data[i];
        assert(`Expected a stable identifier`, isStableIdentifier(identifier));
        if (cache.recordIsLoaded(identifier, true)) {
          identifiers.push(identifier);
        }
      }
    }

    return [identifiers, jsonApi];
  }

  getManyArray(key: string, definition?: UpgradedMeta): RelatedCollection {
    if (HAS_JSON_API_PACKAGE) {
      let manyArray: RelatedCollection | undefined = this._manyArrayCache[key];
      if (!definition) {
        const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
          .graphFor;
        definition = graphFor(this.store).get(this.identifier, key).definition;
      }

      if (!manyArray) {
        const [identifiers, doc] = this._getCurrentState(this.identifier, key);

        manyArray = new RelatedCollection({
          store: this.store,
          type: definition.type,
          identifier: this.identifier,
          recordData: this.recordData,
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
    relationship: ManyRelationship,
    manyArray: RelatedCollection,
    options?: FindOptions
  ): Promise<RelatedCollection> {
    if (HAS_JSON_API_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key] as Promise<RelatedCollection> | undefined;
      if (loadingPromise) {
        return loadingPromise;
      }

      const jsonApi = this.recordData.getRelationship(this.identifier, key) as CollectionResourceRelationship;
      const promise = this._findHasManyByJsonApiResource(jsonApi, this.identifier, relationship, options);

      if (!promise) {
        manyArray.isLoaded = true;
        return resolve(manyArray);
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

  reloadHasMany(key: string, options?: FindOptions) {
    if (HAS_JSON_API_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key];
      if (loadingPromise) {
        return loadingPromise;
      }
      const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
        .graphFor;
      const relationship = graphFor(this.store).get(this.identifier, key) as ManyRelationship;
      const { definition, state } = relationship;

      state.hasFailedLoadAttempt = false;
      state.shouldForceReload = true;
      let manyArray = this.getManyArray(key, definition);
      let promise = this.fetchAsyncHasMany(key, relationship, manyArray, options);

      if (this._relationshipProxyCache[key]) {
        return this._updatePromiseProxyFor('hasMany', key, { promise });
      }

      return promise;
    }
    assert(`hasMany only works with the @ember-data/json-api package`);
  }

  getHasMany(key: string, options?: FindOptions): PromiseManyArray | RelatedCollection {
    if (HAS_JSON_API_PACKAGE) {
      const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
        .graphFor;
      const relationship = graphFor(this.store).get(this.identifier, key) as ManyRelationship;
      const { definition, state } = relationship;
      let manyArray = this.getManyArray(key, definition);

      if (definition.isAsync) {
        if (state.hasFailedLoadAttempt) {
          return this._relationshipProxyCache[key] as PromiseManyArray;
        }

        let promise = this.fetchAsyncHasMany(key, relationship, manyArray, options);

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
    args: { promise: Promise<RecordInstance | null> }
  ): PromiseBelongsTo;
  _updatePromiseProxyFor(
    kind: 'hasMany' | 'belongsTo',
    key: string,
    args: BelongsToProxyCreateArgs | HasManyProxyCreateArgs | { promise: Promise<RecordInstance | null> }
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

  referenceFor(kind: string | null, name: string) {
    let reference = this.references[name];

    if (!reference) {
      if (!HAS_JSON_API_PACKAGE) {
        // TODO @runspired while this feels odd, it is not a regression in capability because we do
        // not today support references pulling from RecordDatas other than our own
        // because of the intimate API access involved. This is something we will need to redesign.
        assert(`snapshot.belongsTo only supported for @ember-data/json-api`);
      }
      const graphFor = (importSync('@ember-data/graph/-private') as typeof import('@ember-data/graph/-private'))
        .graphFor;
      const graph = graphFor(this.store);
      const relationship = graph.get(this.identifier, name);

      if (DEBUG) {
        if (kind) {
          let modelName = this.identifier.type;
          let actualRelationshipKind = relationship.definition.kind;
          assert(
            `You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`,
            actualRelationshipKind === kind
          );
        }
      }

      let relationshipKind = relationship.definition.kind;

      if (relationshipKind === 'belongsTo') {
        reference = new BelongsToReference(
          this.store,
          graph,
          this.identifier,
          relationship as BelongsToRelationship,
          name
        );
      } else if (relationshipKind === 'hasMany') {
        reference = new HasManyReference(this.store, graph, this.identifier, relationship as ManyRelationship, name);
      }

      this.references[name] = reference;
    }

    return reference;
  }

  _findHasManyByJsonApiResource(
    resource: CollectionResourceRelationship,
    parentIdentifier: StableRecordIdentifier,
    relationship: ManyRelationship,
    options: FindOptions = {}
  ): Promise<void | unknown[]> | void {
    if (HAS_JSON_API_PACKAGE) {
      if (!resource) {
        return;
      }
      const { definition, state } = relationship;
      const adapter = this.store.adapterFor(definition.type);
      const { isStale, hasDematerializedInverse, hasReceivedData, isEmpty, shouldForceReload } = state;
      const allInverseRecordsAreLoaded = areAllInverseRecordsLoaded(this.store, resource);
      const shouldFindViaLink =
        resource.links &&
        resource.links.related &&
        (typeof adapter.findHasMany === 'function' || typeof resource.data === 'undefined') &&
        (shouldForceReload || hasDematerializedInverse || isStale || (!allInverseRecordsAreLoaded && !isEmpty));

      // fetch via link
      if (shouldFindViaLink) {
        // findHasMany, although not public, does not need to care about our upgrade relationship definitions
        // and can stick with the public definition API for now.
        const relationshipMeta = this.store
          .getSchemaDefinitionService()
          .relationshipsDefinitionFor({ type: definition.inverseType })[definition.key];
        let adapter = this.store.adapterFor(parentIdentifier.type);

        /*
          If a relationship was originally populated by the adapter as a link
          (as opposed to a list of IDs), this method is called when the
          relationship is fetched.

          The link (which is usually a URL) is passed through unchanged, so the
          adapter can make whatever request it wants.

          The usual use-case is for the server to register a URL as a link, and
          then use that URL in the future to make a request for the relationship.
        */
        assert(
          `You tried to load a hasMany relationship but you have no adapter (for ${parentIdentifier.type})`,
          adapter
        );
        assert(
          `You tried to load a hasMany relationship from a specified 'link' in the original payload but your adapter does not implement 'findHasMany'`,
          typeof adapter.findHasMany === 'function'
        );

        return _findHasMany(adapter, this.store, parentIdentifier, resource.links!.related, relationshipMeta, options);
      }

      const preferLocalCache = hasReceivedData && !isEmpty;
      const hasLocalPartialData =
        hasDematerializedInverse || (isEmpty && Array.isArray(resource.data) && resource.data.length > 0);

      // fetch using data, pulling from local cache if possible
      if (!shouldForceReload && !isStale && (preferLocalCache || hasLocalPartialData)) {
        if (allInverseRecordsAreLoaded) {
          return;
        }
        assert(`Expected collection to be an array`, Array.isArray(resource.data));
        if (allInverseRecordsAreLoaded) {
          return;
        }
        let finds = new Array(resource.data.length);
        let cache = this.store._instanceCache;
        for (let i = 0; i < resource.data.length; i++) {
          const identifier = resource.data[i];
          assert(`expected a stable identifier`, isStableIdentifier(identifier));
          finds[i] = cache._fetchDataIfNeededForIdentifier(identifier, options);
        }

        return all(finds);
      }

      let hasData = hasReceivedData && !isEmpty;

      // fetch by data
      if (hasData || hasLocalPartialData) {
        const identifiers = resource.data;
        assert(`Expected collection to be an array`, Array.isArray(identifiers));
        assert(`Expected stable identifiers`, identifiers.every(isStableIdentifier));
        let fetches = new Array(identifiers.length);
        const manager = this.store._fetchManager;

        for (let i = 0; i < identifiers.length; i++) {
          let identifier = identifiers[i];
          assertIdentifierHasId(identifier);
          fetches[i] = manager.scheduleFetch(identifier, options);
        }

        return all(fetches);
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
    relationship: BelongsToRelationship,
    options: FindOptions = {}
  ): Promise<StableRecordIdentifier | null> {
    if (!resource) {
      return resolve(null);
    }

    const identifier = resource.data ? resource.data : null;
    assert(`Expected a stable identifier`, !identifier || isStableIdentifier(identifier));

    let { isStale, hasDematerializedInverse, hasReceivedData, isEmpty, shouldForceReload } = relationship.state;

    // short circuit if we are already loading
    let pendingRequest = identifier && this.store._fetchManager.getPendingFetch(identifier, options);
    if (pendingRequest) {
      return pendingRequest;
    }

    const allInverseRecordsAreLoaded = areAllInverseRecordsLoaded(this.store, resource);
    const shouldFindViaLink =
      resource.links?.related &&
      (shouldForceReload || hasDematerializedInverse || isStale || (!allInverseRecordsAreLoaded && !isEmpty));

    // fetch via link
    if (shouldFindViaLink) {
      const relationshipMeta = this.store.getSchemaDefinitionService().relationshipsDefinitionFor(this.identifier)[
        relationship.definition.key
      ];
      assert(`Attempted to access a belongsTo relationship but no definition exists for it`, relationshipMeta);

      return _findBelongsTo(this.store, parentIdentifier, resource.links!.related, relationshipMeta, options);
    }

    let preferLocalCache = hasReceivedData && allInverseRecordsAreLoaded && !isEmpty;
    let hasLocalPartialData = hasDematerializedInverse || (isEmpty && resource.data);
    // null is explicit empty, undefined is "we don't know anything"
    const localDataIsEmpty = resource.data === undefined || resource.data === null;

    // fetch using data, pulling from local cache if possible
    if (!shouldForceReload && !isStale && (preferLocalCache || hasLocalPartialData)) {
      /*
        We have canonical data, but our local state is empty
       */
      if (localDataIsEmpty) {
        return resolve(null);
      }

      if (!identifier) {
        assert(`No Information found for ${resource.data!.lid}`, identifier);
      }

      return this.store._instanceCache._fetchDataIfNeededForIdentifier(identifier, options);
    }

    let resourceIsLocal = !localDataIsEmpty && resource.data!.id === null;

    if (identifier && resourceIsLocal) {
      return resolve(identifier);
    }

    // fetch by data
    if (identifier && !localDataIsEmpty) {
      assertIdentifierHasId(identifier);

      return this.store._fetchManager.scheduleFetch(identifier, options);
    }

    // we were explicitly told we have no data and no links.
    //   TODO if the relationshipIsStale, should we hit the adapter anyway?
    return resolve(null);
  }

  destroy() {
    this.isDestroying = true;

    let cache: Dict<{ destroy(): void }> = this._manyArrayCache;
    this._manyArrayCache = Object.create(null);
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
    });

    cache = this._relationshipProxyCache;
    this._relationshipProxyCache = Object.create(null);
    Object.keys(cache).forEach((key) => {
      const proxy = cache[key]!;
      if (proxy.destroy) {
        proxy.destroy();
      }
    });

    cache = this.references;
    this.references = Object.create(null);
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
    });
    this.isDestroyed = true;
  }
}

function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: BelongsToRelationship,
  value: StableRecordIdentifier | null
): RecordInstance | null;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: ManyRelationship,
  value: RelatedCollection
): RelatedCollection;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: BelongsToRelationship,
  value: null,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: ManyRelationship,
  value: RelatedCollection,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: BelongsToRelationship | ManyRelationship,
  value: RelatedCollection | StableRecordIdentifier | null,
  error?: Error
): RelatedCollection | RecordInstance | null {
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
    let proxy = recordExt._relationshipProxyCache[key];
    // belongsTo relationships are sometimes unloaded
    // when a load fails, in this case we need
    // to make sure that we aren't proxying
    // to destroyed content
    // for the sync belongsTo reload case there will be no proxy
    // for the async reload case there will be no proxy if the ui
    // has never been accessed
    if (proxy && !isHasMany) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (proxy.content && proxy.content.isDestroying) {
        (proxy as PromiseBelongsTo).set('content', null);
      }
    }

    throw error;
  }

  if (isHasMany) {
    (value as RelatedCollection).isLoaded = true;
  }

  relationship.state.hasFailedLoadAttempt = false;
  // only set to not stale if no error is thrown
  relationship.state.isStale = false;

  return isHasMany || !value
    ? (value as RelatedCollection | null)
    : recordExt.store.peekRecord(value as StableRecordIdentifier);
}

type PromiseProxyRecord = { then(): void; content: RecordInstance | null | undefined };

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | RecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (DEPRECATE_PROMISE_PROXIES) {
    if (isPromiseRecord(recordOrPromiseRecord)) {
      let content = recordOrPromiseRecord.content;
      assert(
        'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.',
        content !== undefined
      );
      deprecate(
        `You passed in a PromiseProxy to a Relationship API that now expects a resolved value. await the value before setting it.`,
        false,
        {
          id: 'ember-data:deprecate-promise-proxies',
          until: '5.0',
          since: {
            enabled: '4.7',
            available: '4.7',
          },
          for: 'ember-data',
        }
      );
      return content ? recordIdentifierFor(content) : null;
    }
  }

  return recordIdentifierFor(recordOrPromiseRecord);
}

function isPromiseRecord(record: PromiseProxyRecord | RecordInstance): record is PromiseProxyRecord {
  return !!record.then;
}

function anyUnloaded(store: Store, relationship: ManyRelationship) {
  let state = relationship.localState;
  const cache = store._instanceCache;
  const unloaded = state.find((s) => {
    let isLoaded = cache.recordIsLoaded(s, true);
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

function isBelongsTo(
  relationship: BelongsToRelationship | ImplicitRelationship | ManyRelationship
): relationship is BelongsToRelationship {
  return relationship.definition.kind === 'belongsTo';
}
