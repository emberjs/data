import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { importSync } from '@embroider/macros';
import { all, resolve } from 'rsvp';

import { HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import type { BelongsToRelationship, ManyRelationship } from '@ember-data/record-data/-private';
import type { UpgradedMeta } from '@ember-data/record-data/-private/graph/-edge-definition';
import ImplicitRelationship from '@ember-data/record-data/-private/relationships/state/implicit';
import type Store from '@ember-data/store';
import { recordDataFor, recordIdentifierFor, storeFor } from '@ember-data/store/-private';
import { IdentifierCache } from '@ember-data/store/-private/caches/identifier-cache';
import type { DSModel } from '@ember-data/types/q/ds-model';
import {
  CollectionResourceRelationship,
  ResourceIdentifierObject,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import type { JsonApiRelationship } from '@ember-data/types/q/record-data-json-api';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import { _findBelongsTo, _findHasMany } from './legacy-data-fetch';
import { assertIdentifierHasId } from './legacy-data-utils';
import type { ManyArrayCreateArgs } from './many-array';
import ManyArray from './many-array';
import type { BelongsToProxyCreateArgs, BelongsToProxyMeta } from './promise-belongs-to';
import PromiseBelongsTo from './promise-belongs-to';
import type { HasManyProxyCreateArgs } from './promise-many-array';
import PromiseManyArray from './promise-many-array';
import BelongsToReference from './references/belongs-to';
import HasManyReference from './references/has-many';

type ManyArrayFactory = { create(args: ManyArrayCreateArgs): ManyArray };
type PromiseBelongsToFactory = { create(args: BelongsToProxyCreateArgs): PromiseBelongsTo };

export class LegacySupport {
  declare record: DSModel;
  declare store: Store;
  declare recordData: RecordData;
  declare references: Dict<BelongsToReference | HasManyReference>;
  declare identifier: StableRecordIdentifier;
  declare _manyArrayCache: Dict<ManyArray>;
  declare _relationshipPromisesCache: Dict<Promise<ManyArray | RecordInstance>>;
  declare _relationshipProxyCache: Dict<PromiseManyArray | PromiseBelongsTo>;

  declare isDestroying: boolean;
  declare isDestroyed: boolean;

  constructor(record: DSModel) {
    this.record = record;
    this.store = storeFor(record)!;
    this.identifier = recordIdentifierFor(record);
    this.recordData = this.store._instanceCache.getRecordData(this.identifier);

    this._manyArrayCache = Object.create(null) as Dict<ManyArray>;
    this._relationshipPromisesCache = Object.create(null) as Dict<Promise<ManyArray | RecordInstance>>;
    this._relationshipProxyCache = Object.create(null) as Dict<PromiseManyArray | PromiseBelongsTo>;
    this.references = Object.create(null) as Dict<BelongsToReference>;
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

    const graphFor = (
      importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
    ).graphFor;
    const relationship = graphFor(this.store).get(this.identifier, key);
    assert(`Expected ${key} to be a belongs-to relationship`, isBelongsTo(relationship));

    let resource = this.recordData.getBelongsTo(key);
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
    let resource = recordData.getBelongsTo(key);
    let relatedIdentifier =
      resource && resource.data ? this.store.identifierCache.getOrCreateRecordIdentifier(resource.data) : null;

    const store = this.store;
    const graphFor = (
      importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
    ).graphFor;
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

      return this._updatePromiseProxyFor('belongsTo', key, {
        promise,
        content: relatedIdentifier ? store._instanceCache.getRecord(relatedIdentifier) : null,
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
    return this.recordData.setDirtyBelongsTo(key, extractRecordDataFromRecord(value));
  }

  getManyArray(key: string, definition?: UpgradedMeta): ManyArray {
    assert('hasMany only works with the @ember-data/record-data package', HAS_RECORD_DATA_PACKAGE);
    let manyArray: ManyArray | undefined = this._manyArrayCache[key];
    if (!definition) {
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
      definition = graphFor(this.store).get(this.identifier, key).definition;
    }

    if (!manyArray) {
      manyArray = (ManyArray as unknown as ManyArrayFactory).create({
        store: this.store,
        type: this.store.modelFor(definition.type),
        recordData: this.recordData,
        key,
        isPolymorphic: definition.isPolymorphic,
        isAsync: definition.isAsync,
        _inverseIsAsync: definition.inverseIsAsync,
        legacySupport: this,
        isLoaded: !definition.isAsync,
      });
      this._manyArrayCache[key] = manyArray;
    }

    return manyArray;
  }

  fetchAsyncHasMany(
    key: string,
    relationship: ManyRelationship,
    manyArray: ManyArray,
    options?: FindOptions
  ): Promise<ManyArray> {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key] as Promise<ManyArray> | undefined;
      if (loadingPromise) {
        return loadingPromise;
      }

      const jsonApi = this.recordData.getHasMany(key);

      loadingPromise = this._findHasManyByJsonApiResource(jsonApi, this.identifier, relationship, options).then(
        () => handleCompletedRelationshipRequest(this, key, relationship, manyArray),
        (e: Error) => handleCompletedRelationshipRequest(this, key, relationship, manyArray, e)
      );
      this._relationshipPromisesCache[key] = loadingPromise;
      return loadingPromise;
    }
    assert('hasMany only works with the @ember-data/record-data package');
  }

  reloadHasMany(key: string, options?: FindOptions) {
    if (HAS_RECORD_DATA_PACKAGE) {
      let loadingPromise = this._relationshipPromisesCache[key];
      if (loadingPromise) {
        return loadingPromise;
      }
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
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
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  getHasMany(key: string, options?: FindOptions): PromiseManyArray | ManyArray {
    if (HAS_RECORD_DATA_PACKAGE) {
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
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
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  setDirtyHasMany(key: string, records: RecordInstance[]) {
    assertRecordsPassedToHasMany(records);
    return this.recordData.setDirtyHasMany(key, extractRecordDatasFromRecords(records));
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
      if (!HAS_RECORD_DATA_PACKAGE) {
        // TODO @runspired while this feels odd, it is not a regression in capability because we do
        // not today support references pulling from RecordDatas other than our own
        // because of the intimate API access involved. This is something we will need to redesign.
        assert(`snapshot.belongsTo only supported for @ember-data/record-data`);
      }
      const graphFor = (
        importSync('@ember-data/record-data/-private') as typeof import('@ember-data/record-data/-private')
      ).graphFor;
      const relationship = graphFor(this.store).get(this.identifier, name);

      if (DEBUG && kind) {
        let modelName = this.identifier.type;
        let actualRelationshipKind = relationship.definition.kind;
        assert(
          `You tried to get the '${name}' relationship on a '${modelName}' via record.${kind}('${name}'), but the relationship is of kind '${actualRelationshipKind}'. Use record.${actualRelationshipKind}('${name}') instead.`,
          actualRelationshipKind === kind
        );
      }

      let relationshipKind = relationship.definition.kind;

      if (relationshipKind === 'belongsTo') {
        reference = new BelongsToReference(this.store, this.identifier, relationship as BelongsToRelationship, name);
      } else if (relationshipKind === 'hasMany') {
        reference = new HasManyReference(this.store, this.identifier, relationship as ManyRelationship, name);
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
  ): Promise<void | unknown[]> {
    if (HAS_RECORD_DATA_PACKAGE) {
      if (!resource) {
        return resolve();
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
        assert(`Expected collection to be an array`, Array.isArray(resource.data));
        let finds = new Array(resource.data.length);
        for (let i = 0; i < resource.data.length; i++) {
          let identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource.data[i]);
          finds[i] = this.store._instanceCache._fetchDataIfNeededForIdentifier(identifier, options);
        }

        return all(finds);
      }

      let hasData = hasReceivedData && !isEmpty;

      // fetch by data
      if (hasData || hasLocalPartialData) {
        assert(`Expected collection to be an array`, Array.isArray(resource.data));
        let identifiers = resource.data.map((json) => this.store.identifierCache.getOrCreateRecordIdentifier(json));
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
      return resolve();
    }
    assert(`hasMany only works with the @ember-data/record-data package`);
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

    const identifier = resource.data ? this.store.identifierCache.getOrCreateRecordIdentifier(resource.data) : null;

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

    const cache = this._manyArrayCache;
    Object.keys(cache).forEach((key) => {
      cache[key]!.destroy();
      delete cache[key];
    });
    const keys = Object.keys(this._relationshipProxyCache);
    keys.forEach((key) => {
      const proxy = this._relationshipProxyCache[key]!;
      if (proxy.destroy) {
        proxy.destroy();
      }
      delete this._relationshipProxyCache[key];
    });
    if (this.references) {
      const refs = this.references;
      Object.keys(refs).forEach((key) => {
        refs[key]!.destroy();
        delete refs[key];
      });
    }
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
  value: ManyArray
): ManyArray;
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
  value: ManyArray,
  error: Error
): never;
function handleCompletedRelationshipRequest(
  recordExt: LegacySupport,
  key: string,
  relationship: BelongsToRelationship | ManyRelationship,
  value: ManyArray | StableRecordIdentifier | null,
  error?: Error
): ManyArray | RecordInstance | null {
  delete recordExt._relationshipPromisesCache[key];
  relationship.state.shouldForceReload = false;
  const isHasMany = relationship.definition.kind === 'hasMany';

  if (isHasMany) {
    // we don't notify the record property here to avoid refetch
    // only the many array
    (value as ManyArray).notify();
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
    (value as ManyArray).set('isLoaded', true);
  }

  relationship.state.hasFailedLoadAttempt = false;
  // only set to not stale if no error is thrown
  relationship.state.isStale = false;

  return isHasMany || !value
    ? (value as ManyArray | null)
    : recordExt.store.peekRecord(value as StableRecordIdentifier);
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

type PromiseProxyRecord = {
  then(): void;
  content: RecordInstance | null | undefined;
};

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

function anyUnloaded(store: Store, relationship: ManyRelationship) {
  let state = relationship.currentState;
  const cache = store._instanceCache;
  const unloaded = state.find((s) => {
    let isLoaded = cache.recordIsLoaded(s, true);
    return !isLoaded;
  });

  return unloaded || false;
}

function areAllInverseRecordsLoaded(store: Store, resource: JsonApiRelationship): boolean {
  const cache = store.identifierCache;

  if (Array.isArray(resource.data)) {
    // treat as collection
    // check for unloaded records
    let hasEmptyRecords = resource.data.reduce((hasEmptyModel, resourceIdentifier) => {
      return hasEmptyModel || isEmpty(store, cache, resourceIdentifier);
    }, false);

    return !hasEmptyRecords;
  } else {
    // treat as single resource
    if (!resource.data) {
      return true;
    } else {
      return !isEmpty(store, cache, resource.data);
    }
  }
}

function isEmpty(store: Store, cache: IdentifierCache, resource: ResourceIdentifierObject): boolean {
  const identifier = cache.getOrCreateRecordIdentifier(resource);
  const recordData = store._instanceCache.peek({ identifier, bucket: 'recordData' });
  return !recordData || !!recordData.isEmpty?.();
}

function isBelongsTo(
  relationship: BelongsToRelationship | ImplicitRelationship | ManyRelationship
): relationship is BelongsToRelationship {
  return relationship.definition.kind === 'belongsTo';
}
