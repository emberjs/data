import { assert, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import type { ExistingResourceObject, NewResourceIdentifierObject, ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';

import InternalModel from '../legacy-model-support/internal-model';
import RecordReference from '../legacy-model-support/record-reference';
import RecordDataStoreWrapper from '../managers/record-data-store-wrapper';
import Snapshot from '../network/snapshot';
import type { CreateRecordProperties } from '../store-service';
import type Store from '../store-service';
import { assertIdentifierHasId } from '../store-service';
import coerceId, { ensureStringId } from '../utils/coerce-id';
import constructResource from '../utils/construct-resource';
import normalizeModelName from '../utils/normalize-model-name';
import WeakCache from '../utils/weak-cache';
import { internalModelFactoryFor, recordIdentifierFor, setRecordIdentifier } from './internal-model-factory';
import recordDataFor, { setRecordDataFor } from './record-data-for';
import { JsonApiResource } from '@ember-data/types/q/record-data-json-api';
import { Dict } from '@ember-data/types/q/utils';
import { isStableIdentifier } from './identifier-cache';

const RECORD_REFERENCES = new WeakCache<StableRecordIdentifier, RecordReference>(DEBUG ? 'reference' : '');
export const StoreMap = new WeakCache<RecordInstance, Store>(DEBUG ? 'store' : '');

export function storeFor(record: RecordInstance): Store | undefined {
  const store = StoreMap.get(record);

  assert(
    `A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.`,
    store
  );
  return store;
}

type Caches = {
  record: WeakMap<StableRecordIdentifier, RecordInstance>;
  recordData: WeakMap<StableRecordIdentifier, RecordData>;
};


export class InstanceCache {
  declare store: Store;
  declare _storeWrapper: RecordDataStoreWrapper;
  declare peekList: Dict<Set<StableRecordIdentifier>>;


  #instances: Caches = {
    record: new WeakMap<StableRecordIdentifier, RecordInstance>(),
    recordData: new WeakMap<StableRecordIdentifier, RecordData>(),
  };

  recordIsLoaded(identifier: StableRecordIdentifier) {
    const recordData = this.peek({ identifier, bucket: 'recordData' });
    if (!recordData) {
      return false;
    }
    const isNew = recordData.isNew?.() ||  false;
    const isEmpty = recordData.isEmpty?.() || false;

    // if we are new we must consider ourselves loaded
    if (isNew) {
      return true;
    }
    // even if we have a past request, if we are now empty we are not loaded
    // typically this is true after an unloadRecord call

    // if we are not empty, not new && we have a fulfilled request then we are loaded
    // we should consider allowing for something to be loaded that is simply "not empty".
    // which is how RecordState currently handles this case; however, RecordState is buggy
    // in that it does not account for unloading.
    return !isEmpty
  }

  constructor(store: Store) {
    this.store = store;
    this.peekList = Object.create(null);

    this._storeWrapper = new RecordDataStoreWrapper(this.store);
    this.__recordDataFor = this.__recordDataFor.bind(this);

    RECORD_REFERENCES._generator = (identifier) => {
      return new RecordReference(this.store, identifier);
    };

    store.identifierCache.__configureMerge((identifier, matchedIdentifier, resourceData) => {
      let intendedIdentifier = identifier;
      if (identifier.id !== matchedIdentifier.id) {
        intendedIdentifier = 'id' in resourceData && identifier.id === resourceData.id ? identifier : matchedIdentifier;
      } else if (identifier.type !== matchedIdentifier.type) {
        intendedIdentifier =
          'type' in resourceData && identifier.type === resourceData.type ? identifier : matchedIdentifier;
      }
      let altIdentifier = identifier === intendedIdentifier ? matchedIdentifier : identifier;

      // check for duplicate entities
      let imHasRecord = this.#instances.record.has(intendedIdentifier);
      let otherHasRecord = this.#instances.record.has(altIdentifier);
      let imRecordData = this.#instances.recordData.get(intendedIdentifier) || null;
      let otherRecordData = this.#instances.record.get(altIdentifier) || null;

      // we cannot merge entities when both have records
      // (this may not be strictly true, we could probably swap the recordData the record points at)
      if (imHasRecord && otherHasRecord) {
        // TODO we probably don't need to throw these errors anymore
        // once InternalModel is fully removed, as we can just "swap"
        // what data source the abandoned record points at so long as
        // it itself is not retained by the store in any way.
        if ('id' in resourceData) {
          throw new Error(
            `Failed to update the 'id' for the RecordIdentifier '${identifier.type}:${identifier.id} (${identifier.lid})' to '${resourceData.id}', because that id is already in use by '${matchedIdentifier.type}:${matchedIdentifier.id} (${matchedIdentifier.lid})'`
          );
        }
        // TODO @runspired determine when this is even possible
        assert(
          `Failed to update the RecordIdentifier '${identifier.type}:${identifier.id} (${identifier.lid})' to merge with the detected duplicate identifier '${matchedIdentifier.type}:${matchedIdentifier.id} (${matchedIdentifier.lid})'`
        );
      }

      // remove "other" from cache
      if (otherHasRecord) {
        cache.delete(altIdentifier);
        this.peekList[altIdentifier.type]?.delete(altIdentifier);
      }

      if (imRecordData === null && otherRecordData === null) {
        // nothing more to do
        return intendedIdentifier;

        // only the other has a RecordData
        // OR only the other has a Record
      } else if ((imRecordData === null && otherRecordData !== null) || (imRecordData && !imHasRecord && otherRecordData && otherHasRecord)) {
        if (imRecordData) {
          // TODO check if we are retained in any async relationships
          cache.delete(intendedIdentifier);
          this.peekList[intendedIdentifier.type]?.delete(intendedIdentifier);
          // im.destroy();
        }
        im = otherIm!;
        // TODO do we need to notify the id change?
        im.identifier = intendedIdentifier;
        cache.set(intendedIdentifier, im);
        this.peekList[intendedIdentifier.type] = this.peekList[intendedIdentifier.type] || new Set();
        this.peekList[intendedIdentifier.type]!.add(intendedIdentifier);

        // just use im
      } else {
        // otherIm.destroy();
      }

      /*
      TODO @runspired consider adding this to make polymorphism even nicer
      if (HAS_RECORD_DATA_PACKAGE) {
        if (identifier.type !== matchedIdentifier.type) {
          const graphFor = importSync('@ember-data/record-data/-private').graphFor;
          graphFor(this).registerPolymorphicType(identifier.type, matchedIdentifier.type);
        }
      }
      */

      return intendedIdentifier;
    });
  }
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'record' }): RecordInstance | undefined;
  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'recordData' }): RecordData | undefined;
  peek({
    identifier,
    bucket,
  }: {
    identifier: StableRecordIdentifier;
    bucket: 'record' | 'recordData';
  }): RecordData | RecordInstance | undefined {
    return this.#instances[bucket]?.get(identifier);
  }
  set({
    identifier,
    bucket,
    value,
  }: {
    identifier: StableRecordIdentifier;
    bucket: 'record';
    value: RecordInstance;
  }): void {
    this.#instances[bucket].set(identifier, value);
  }


  getRecord(identifier: StableRecordIdentifier, properties?: CreateRecordProperties): RecordInstance {
    let record = this.peek({ identifier, bucket: 'record' });

    if (!record) {
      if (properties && 'id' in properties) {
        assert(`expected id to be a string or null`, properties.id !== undefined);
      }

      record = this._instantiateRecord(this.getRecordData(identifier), identifier, properties);
      this.set({ identifier, bucket: 'record', value: record });
    }

    return record;
  }

  clear(type?: string) {
    if (type === undefined) {
      let keys = Object.keys(this.peekList);
      keys.forEach((key) => this.clear(key));
    } else {
      let identifiers = this.peekList[type];
      if (identifiers) {
        identifiers.forEach((identifier) => {
          // TODO we rely on not removing the main cache
          // and only removing the peekList cache apparently.
          // we should figure out this duality and codify whatever
          // signal it is actually trying to give us.
          // this.cache.delete(identifier);
          this.peekList[identifier.type]!.delete(identifier);
          this.unloadRecord(identifier);
          // TODO we don't remove the identifier, should we?
        });
      }
    }
  }

  getReference(identifier: StableRecordIdentifier) {
    return RECORD_REFERENCES.lookup(identifier);
  }

  _fetchDataIfNeededForIdentifier(
    identifier: StableRecordIdentifier,
    options: FindOptions = {}
  ): Promise<StableRecordIdentifier> {
    const internalModel = this.getInternalModel(identifier);

    // pre-loading will change the isEmpty value
    // TODO stpre this state somewhere other than InternalModel
    const { isEmpty, isLoading } = internalModel;

    if (options.preload) {
      this.store._backburner.join(() => {
        preloadData(this.store, identifier, options.preload);
      });
    }

    let promise: Promise<StableRecordIdentifier>;
    if (isEmpty) {
      assertIdentifierHasId(identifier);

      promise = this.store._fetchManager.scheduleFetch(identifier, options);
    } else if (isLoading) {
      promise = this.store._fetchManager.getPendingFetch(identifier, options)!;
      assert(`Expected to find a pending request for a record in the loading state, but found none`, promise);
    } else {
      promise = resolve(identifier);
    }

    return promise;
  }

  _instantiateRecord(
    recordData: RecordData,
    identifier: StableRecordIdentifier,
    properties?: { [key: string]: unknown }
  ) {
    // assert here
    if (properties !== undefined) {
      assert(
        `You passed '${typeof properties}' as properties for record creation instead of an object.`,
        typeof properties === 'object' && properties !== null
      );

      const { type } = identifier;

      // convert relationship Records to RecordDatas before passing to RecordData
      let defs = this.store.getSchemaDefinitionService().relationshipsDefinitionFor({ type });

      if (defs !== null) {
        let keys = Object.keys(properties);
        let relationshipValue;

        for (let i = 0; i < keys.length; i++) {
          let prop = keys[i];
          let def = defs[prop];

          if (def !== undefined) {
            if (def.kind === 'hasMany') {
              if (DEBUG) {
                assertRecordsPassedToHasMany(properties[prop] as RecordInstance[]);
              }
              relationshipValue = extractRecordDatasFromRecords(properties[prop] as RecordInstance[]);
            } else {
              relationshipValue = extractRecordDataFromRecord(properties[prop] as RecordInstance);
            }

            properties[prop] = relationshipValue;
          }
        }
      }
    }

    // TODO guard against initRecordOptions no being there
    let createOptions = recordData._initRecordCreateOptions(properties);
    //TODO Igor pass a wrapper instead of RD
    let record = this.store.instantiateRecord(
      identifier,
      createOptions,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this.__recordDataFor,
      this.store._notificationManager
    );
    setRecordIdentifier(record, identifier);
    setRecordDataFor(record, recordData);
    StoreMap.set(record, this.store);
    return record;
  }

  _teardownRecord(record: RecordInstance) {
    StoreMap.delete(record);
    // TODO remove identifier:record cache link
    this.store.teardownRecord(record);
  }

  removeRecord(identifier: StableRecordIdentifier): boolean {
    let record = this.peek({ identifier, bucket: 'record' });

    if (record) {
      this.#instances.record.delete(identifier);
      this._teardownRecord(record);
    }

    return !!record;
  }

  // TODO move RecordData Cache into InstanceCache
  getRecordData(identifier: StableRecordIdentifier) {
    let recordData = this.peek({ identifier, bucket: 'recordData' });

    if (!recordData) {
      recordData = this._createRecordData(identifier);
      this.#instances.recordData.set(identifier, recordData);
      this.getInternalModel(identifier).hasRecordData = true;
      this.peekList[identifier.type] = this.peekList[identifier.type] || new Set();
      this.peekList[identifier.type]!.add(identifier);
    }

    return recordData;
  }

  // TODO move InternalModel cache into InstanceCache
  getInternalModel(identifier: StableRecordIdentifier) {
    return this._internalModelForResource(identifier);
  }

  createSnapshot(identifier: StableRecordIdentifier, options: FindOptions = {}): Snapshot {
    return new Snapshot(options, identifier, this.store);
  }

  __recordDataFor(resource: RecordIdentifier) {
    const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource);
    return this.getRecordData(identifier);
  }

  // TODO move this to InstanceCache
  _createRecordData(identifier: StableRecordIdentifier): RecordData {
    const recordData = this.store.createRecordDataFor(
      identifier.type,
      identifier.id,
      identifier.lid,
      this._storeWrapper
    );
    setRecordDataFor(identifier, recordData);
    // TODO this is invalid for v2 recordData but required
    // for v1 recordData. Remember to remove this once the
    // RecordData manager handles converting recordData to identifier
    setRecordIdentifier(recordData, identifier);
    return recordData;
  }

  setRecordId(modelName: string, newId: string, lid: string) {
    const resource = constructResource(normalizeModelName(modelName), null, coerceId(lid));
    const maybeIdentifier = this.store.identifierCache.peekRecordIdentifier(resource);

    if (maybeIdentifier) {
      // TODO handle consequences of identifier merge for notifications
      this._setRecordId(modelName, newId, lid);
      this.store._notificationManager.notify(maybeIdentifier, 'identity');
    }
  }

  _setRecordId(type: string, id: string, lid: string) {
    const resource: NewResourceIdentifierObject = { type, id: null, lid };
    const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource);

    let oldId = identifier.id;
    let modelName = identifier.type;

    // ID absolutely can't be missing if the oldID is empty (missing Id in response for a new record)
    assert(
      `'${modelName}' was saved to the server, but the response does not have an id and your record does not either.`,
      !(id === null && oldId === null)
    );

    // ID absolutely can't be different than oldID if oldID is not null
    // TODO this assertion and restriction may not strictly be needed in the identifiers world
    assert(
      `Cannot update the id for '${modelName}:${lid}' from '${oldId}' to '${id}'.`,
      !(oldId !== null && id !== oldId)
    );

    // ID can be null if oldID is not null (altered ID in response for a record)
    // however, this is more than likely a developer error.
    if (oldId !== null && id === null) {
      warn(
        `Your ${modelName} record was saved to the server, but the response does not have an id.`,
        !(oldId !== null && id === null)
      );
      return;
    }

    let existingIdentifier = this.store.identifierCache.peekRecordIdentifier({ type: modelName, id });

    assert(
      `'${modelName}' was saved to the server, but the response returned the new id '${id}', which has already been used with another record.'`,
     existingIdentifier === identifier
    );

    if (identifier.id === null) {
      // TODO potentially this needs to handle merged result
      this.store.identifierCache.updateRecordIdentifier(identifier, { type, id });
    }

    // TODO update recordData if needed ?
  }

  _load(data: ExistingResourceObject): StableExistingRecordIdentifier {
    // TODO type should be pulled from the identifier for debug
    let modelName = data.type;
    assert(
      `You must include an 'id' for ${modelName} in an object passed to 'push'`,
      data.id !== null && data.id !== undefined && data.id !== ''
    );
    assert(
      `You tried to push data with a type '${modelName}' but no model could be found with that name.`,
      this.store.getSchemaDefinitionService().doesTypeExist(modelName)
    );

    // TODO this should determine identifier via the cache before making assumptions
    const resource = constructResource(normalizeModelName(data.type), ensureStringId(data.id), coerceId(data.lid));
    const maybeIdentifier = this.store.identifierCache.peekRecordIdentifier(resource);

    let internalModel = internalModelFactoryFor(this.store).lookup(resource, data);

    // store.push will be from empty
    // findRecord will be from root.loading
    // this cannot be loading state if we do not already have an identifier
    // all else will be updates
    const isLoading = internalModel.isLoading || (maybeIdentifier && !this.recordIsLoaded(maybeIdentifier));
    const isUpdate = internalModel.isEmpty === false && !isLoading;

    // exclude store.push (root.empty) case
    let identifier = internalModel.identifier;
    if (isUpdate || isLoading) {
      let updatedIdentifier = this.store.identifierCache.updateRecordIdentifier(identifier, data);

      if (updatedIdentifier !== identifier) {
        // we encountered a merge of identifiers in which
        // two identifiers (and likely two internalModels)
        // existed for the same resource. Now that we have
        // determined the correct identifier to use, make sure
        // that we also use the correct internalModel.
        identifier = updatedIdentifier;
        internalModel = internalModelFactoryFor(this.store).lookup(identifier);
      }
    }

    const recordData = this.getRecordData(identifier);
    if (recordData.isNew?.()) {
      this.store._notificationManager.notify(identifier, 'identity');
    }

    const hasRecord = this.#instances.record.has(identifier);
    recordData.pushData(data, hasRecord);

    if (!isUpdate) {
      this.store.recordArrayManager.recordDidChange(identifier);
    }

    return identifier as StableExistingRecordIdentifier;
  }

  destroyRecord(identifier: StableRecordIdentifier) {
    const record = this.#instances.record.get(identifier);
    assert(
      'Cannot destroy record while it is still materialized',
      !record || record.isDestroyed || record.isDestroying
    );

    this.peekList[identifier.type]!.delete(identifier);
    this.store.identifierCache.forgetRecordIdentifier(identifier);
  }

  unloadRecord(identifier: StableRecordIdentifier) {
    if (DEBUG) {
      const requests = this.store.getRequestStateService().getPendingRequestsForRecord(identifier);
      if (
        requests.some((req) => {
          return req.type === 'mutation';
        })
      ) {
        assert('You can only unload a record which is not inFlight. `' + identifier + '`');
      }
    }
    const internalModel = this.getInternalModel(identifier);

    // this has to occur before the internal model is removed
    // for legacy compat.
    this.store._instanceCache.removeRecord(identifier);
    const recordData = this.#instances.recordData.get(identifier);

    if (recordData) {
      // TODO is this join still necessary?
      this.store._backburner.join(() => {
        recordData.unloadRecord();
      });
    }

    this.store.recordArrayManager.recordDidChange(identifier);
  }
}

export function isHiddenFromRecordArrays(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  // During dematerialization we don't want to rematerialize the record.
  // recordWasDeleted can cause other records to rematerialize because it
  // removes the internal model from the array and Ember arrays will always
  // `objectAt(0)` and `objectAt(len -1)` to check whether `firstObject` or
  // `lastObject` have changed.  When this happens we don't want those
  // models to rematerialize their records.

  // eager checks to avoid instantiating record data if we are empty or loading
  let recordData = cache.peek({ identifier, bucket: 'recordData' });
  if (!recordData) {
    return true;
  }

  // if isLoading return false
  // if isDematerializing, destroyed, or has scheduled destroy return true
  // TODO eliminate this internalModel need
  const internalModel = cache.getInternalModel(identifier);
  if (!internalModel.isEmpty || internalModel.isLoading) {
    return false;
  }
  if (recordData.isDeletionCommitted?.() || (recordData.isNew?.() && recordData.isDeleted?.())) {
    return true;
  } else {
    return false;
  }
}

function _recordDataIsFullDeleted(recordData: RecordData): boolean {
  if (recordData.isDeletionCommitted?.() || (recordData.isNew?.() && recordData.isDeleted?.())) {
    return true;
  } else {
    return false;
  }
}

export function recordDataIsFullyDeleted(cache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  let recordData = cache.peek({ identifier, bucket: 'recordData' });
  return !recordData || _recordDataIsFullDeleted(recordData);
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
type PromiseProxyRecord = { then(): void; get(str: 'content'): RecordInstance | null | undefined };

function extractRecordDataFromRecord(recordOrPromiseRecord: PromiseProxyRecord | RecordInstance | null) {
  if (!recordOrPromiseRecord) {
    return null;
  }

  if (isPromiseRecord(recordOrPromiseRecord)) {
    let content = recordOrPromiseRecord.get && recordOrPromiseRecord.get('content');
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
function preloadData(store: Store, identifier: StableRecordIdentifier, preload) {
  let jsonPayload: JsonApiResource = {};
  //TODO(Igor) consider the polymorphic case
  const modelClass = store.modelFor(identifier.type);
  Object.keys(preload).forEach((key) => {
    let preloadValue = preload[key];
    let relationshipMeta = modelClass.metaForProperty(key);
    if (relationshipMeta.isRelationship) {
      if (!jsonPayload.relationships) {
        jsonPayload.relationships = {};
      }
      jsonPayload.relationships[key] = preloadRelationship(modelClass, key, preloadValue);
    } else {
      if (!jsonPayload.attributes) {
        jsonPayload.attributes = {};
      }
      jsonPayload.attributes[key] = preloadValue;
    }
  });
  store._instanceCache.getRecordData(identifier).pushData(jsonPayload);
}


function preloadRelationship(schema, key: string, preloadValue) {
  const relationshipMeta = schema.metaForProperty(key);
  const relatedType = relationshipMeta.type;
  let data;
  if (relationshipMeta.kind === 'hasMany') {
    assert('You need to pass in an array to set a hasMany property on a record', Array.isArray(preloadValue));
    data = preloadValue.map((value) => _convertPreloadRelationshipToJSON(value, relatedType));
  } else {
    data = _convertPreloadRelationshipToJSON(preloadValue, relatedType);
  }
  return { data };
}

/*
  findRecord('user', '1', { preload: { friends: ['1'] }});
  findRecord('user', '1', { preload: { friends: [record] }});
*/
function _convertPreloadRelationshipToJSON(value, type: string) {
  if (typeof value === 'string' || typeof value === 'number') {
    return { type, id: value };
  }
  // TODO if not a record instance assert it's an identifier
  // and allow identifiers to be used
  return recordIdentifierFor(value);
}
