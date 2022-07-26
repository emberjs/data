import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { importSync } from '@embroider/macros';

import type { ManyArray } from '@ember-data/model/-private';
import type { ManyArrayCreateArgs } from '@ember-data/model/-private/system/many-array';
import type {
  BelongsToProxyCreateArgs,
  BelongsToProxyMeta,
} from '@ember-data/model/-private/system/promise-belongs-to';
import type { HasManyProxyCreateArgs } from '@ember-data/model/-private/system/promise-many-array';
import { HAS_RECORD_DATA_PACKAGE } from '@ember-data/private-build-infra';
import type {
  BelongsToRelationship,
  ManyRelationship,
  RecordData as DefaultRecordData,
} from '@ember-data/record-data/-private';
import type { UpgradedMeta } from '@ember-data/record-data/-private/graph/-edge-definition';
import type {
  DefaultSingleResourceRelationship,
  RelationshipRecordData,
} from '@ember-data/record-data/-private/ts-interfaces/relationship-record-data';
import { InternalModel, recordDataFor, recordIdentifierFor, storeFor } from '@ember-data/store/-private';
import type CoreStore from '@ember-data/store/-private/system/core-store';
import { DSModel } from '@ember-data/store/-private/ts-interfaces/ds-model';
import type { StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RelationshipSchema } from '@ember-data/store/-private/ts-interfaces/record-data-schemas';
import type { RecordInstance } from '@ember-data/store/-private/ts-interfaces/record-instance';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';

import BelongsToReference from './references/belongs-to';
import PromiseBelongsTo from './system/promise-belongs-to';
import PromiseManyArray from './system/promise-many-array';

type ManyArrayFactory = { create(args: ManyArrayCreateArgs): ManyArray };
type PromiseBelongsToFactory = { create(args: BelongsToProxyCreateArgs): PromiseBelongsTo };

export class LegacySupport {
  declare store: CoreStore;
  declare recordData: DefaultRecordData;
  declare references: Dict<BelongsToReference>;
  declare identifier: StableRecordIdentifier;
  declare _manyArrayCache: Dict<ManyArray>;
  declare _relationshipPromisesCache: Dict<Promise<ManyArray | RecordInstance>>;
  declare _relationshipProxyCache: Dict<PromiseManyArray | PromiseBelongsTo>;

  constructor(record: DSModel) {
    this.store = storeFor(record)!;
    this.identifier = recordIdentifierFor(record);
    this.recordData = this.store._instanceCache.getRecordData(this.identifier) as DefaultRecordData;

    this._manyArrayCache = Object.create(null) as Dict<ManyArray>;
    this._relationshipPromisesCache = Object.create(null) as Dict<Promise<ManyArray | RecordInstance>>;
    this._relationshipProxyCache = Object.create(null) as Dict<PromiseManyArray | PromiseBelongsTo>;
    this.references = Object.create(null) as Dict<BelongsToReference>;
  }

  _findBelongsTo(
    key: string,
    resource: DefaultSingleResourceRelationship,
    relationshipMeta: RelationshipSchema,
    options?: Dict<unknown>
  ): Promise<RecordInstance | null> {
    // TODO @runspired follow up if parent isNew then we should not be attempting load here
    // TODO @runspired follow up on whether this should be in the relationship requests cache
    return this.store._findBelongsToByJsonApiResource(resource, this.identifier, relationshipMeta, options).then(
      (identifier: StableRecordIdentifier | null) =>
        handleCompletedRelationshipRequest(this, key, resource._relationship, identifier),
      (e) => handleCompletedRelationshipRequest(this, key, resource._relationship, null, e)
    );
  }

  reloadBelongsTo(key: string, options?: Dict<unknown>): Promise<RecordInstance | null> {
    let loadingPromise = this._relationshipPromisesCache[key] as Promise<RecordInstance | null> | undefined;
    if (loadingPromise) {
      return loadingPromise;
    }

    let resource = this.recordData.getBelongsTo(key);
    // TODO move this to a public api
    if (resource._relationship) {
      resource._relationship.state.hasFailedLoadAttempt = false;
      resource._relationship.state.shouldForceReload = true;
    }
    let relationshipMeta = this.store.getSchemaDefinitionService().relationshipsDefinitionFor(this.identifier)[key];
    assert(`Attempted to reload a belongsTo relationship but no definition exists for it`, relationshipMeta);
    let promise = this._findBelongsTo(key, resource, relationshipMeta, options);
    if (this._relationshipProxyCache[key]) {
      return this._updatePromiseProxyFor('belongsTo', key, { promise });
    }
    return promise;
  }

  getBelongsTo(key: string, options?: Dict<unknown>): PromiseBelongsTo | RecordInstance | null {
    const { identifier, recordData } = this;
    let resource = recordData.getBelongsTo(key);
    let relatedIdentifier =
      resource && resource.data ? this.store.identifierCache.getOrCreateRecordIdentifier(resource.data) : null;
    let relationshipMeta = this.store.getSchemaDefinitionService().relationshipsDefinitionFor(identifier)[key];
    assert(`Attempted to access a belongsTo relationship but no definition exists for it`, relationshipMeta);

    let store = this.store;
    let async = relationshipMeta.options.async;
    let isAsync = typeof async === 'undefined' ? true : async;
    let _belongsToState: BelongsToProxyMeta = {
      key,
      store,
      legacySupport: this,
      modelName: relationshipMeta.type,
    };

    if (isAsync) {
      if (resource._relationship.state.hasFailedLoadAttempt) {
        return this._relationshipProxyCache[key] as PromiseBelongsTo;
      }

      let promise = this._findBelongsTo(key, resource, relationshipMeta, options);

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
          } but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (\`belongsTo({ async: true })\`)`,
          toReturn === null || !store._instanceCache.getInternalModel(relatedIdentifier).isEmpty
        );
        return toReturn;
      }
    }
  }

  setDirtyBelongsTo(key: string, value: RecordInstance | null) {
    return this.recordData.setDirtyBelongsTo(key, extractRecordDataFromRecord(value));
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
      const relationship = graphFor(this.store._storeWrapper).get(this.identifier, name);

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
        reference = new BelongsToReference(this.store, this.identifier, relationship, name);
      } else if (relationshipKind === 'hasMany') {
        // reference = new HasManyReference(this.store, identifierOrInternalModel, relationship, name);
      }

      this.references[name] = reference;
    }

    return reference;
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

export function assertRecordsPassedToHasMany(records: RecordInstance[]) {
  assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(records));
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed ${records
      .map((r) => `${typeof r}`)
      .join(', ')}`,
    (function () {
      return records.every((record) => Object.prototype.hasOwnProperty.call(record, '_internalModel') === true);
    })()
  );
}

export function extractRecordDatasFromRecords(records: RecordInstance[]) {
  return records.map(extractRecordDataFromRecord);
}

export function extractRecordDataFromRecord(recordOrPromiseRecord: RecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (recordOrPromiseRecord.then) {
    let content = recordOrPromiseRecord.get && recordOrPromiseRecord.get('content');
    assert(
      'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.',
      content !== undefined
    );
    return content ? recordDataFor(content) : null;
  }

  return recordDataFor(recordOrPromiseRecord);
}

function anyUnloaded(store: CoreStore, relationship: ManyRelationship) {
  let state = relationship.currentState;
  const unloaded = state.find((s) => {
    let im = store._internalModelForResource(s);
    return im._isDematerializing || !im.isLoaded;
  });

  return unloaded || false;
}
