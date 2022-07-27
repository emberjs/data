import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { resolve } from 'rsvp';

import type { ExistingResourceObject, ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';

import coerceId, { ensureStringId } from './coerce-id';
import type { CreateRecordProperties } from './core-store';
import type Store from './core-store';
import { assertIdentifierHasId } from './core-store';
import { internalModelFactoryFor, setRecordIdentifier } from './internal-model-factory';
import InternalModel from './model/internal-model';
import RecordReference from './model/record-reference';
import normalizeModelName from './normalize-model-name';
import recordDataFor, { setRecordDataFor } from './record-data-for';
import RecordDataStoreWrapper from './record-data-store-wrapper';
import Snapshot from './snapshot';
import constructResource from './utils/construct-resource';
import WeakCache from './weak-cache';

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

  #instances: Caches = {
    record: new WeakMap<StableRecordIdentifier, RecordInstance>(),
    recordData: new WeakMap<StableRecordIdentifier, RecordData>(),
  };

  constructor(store: Store) {
    this.store = store;

    this._storeWrapper = new RecordDataStoreWrapper(this.store);
    this.__recordDataFor = this.__recordDataFor.bind(this);

    RECORD_REFERENCES._generator = (identifier) => {
      return new RecordReference(this.store, identifier);
    };
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
      // TODO store this state somewhere better
      const internalModel = this.getInternalModel(identifier);

      if (internalModel._isDematerializing) {
        // TODO this should be an assertion, this likely means
        // we have a bug to find wherein our own store is calling this
        // with an identifier that should have already been disconnected.
        // the destroy + fetch again case is likely either preserving the
        // identifier for re-use or failing to unload it.
        return null as unknown as RecordInstance;
      }

      // TODO store this state somewhere better
      internalModel.hasRecord = true;

      if (properties && 'id' in properties) {
        assert(`expected id to be a string or null`, properties.id !== undefined);
        internalModel.setId(properties.id);
      }

      record = this._instantiateRecord(this.getRecordData(identifier), identifier, properties);
      this.set({ identifier, bucket: 'record', value: record });
    }

    return record;
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
        internalModel.preloadData(options.preload);
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
    return this.recordDataFor(identifier, false);
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

  // TODO string candidate for early elimination
  _internalModelForResource(resource: ResourceIdentifierObject): InternalModel {
    return internalModelFactoryFor(this.store).getByResource(resource);
  }

  setRecordId(modelName: string, newId: string, clientId: string) {
    internalModelFactoryFor(this.store).setRecordId(modelName, newId, clientId);
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
    const isLoading = internalModel.isLoading || (!internalModel.isLoaded && maybeIdentifier);
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

    internalModel.setupData(data);

    if (!isUpdate) {
      this.store.recordArrayManager.recordDidChange(identifier);
    }

    return identifier as StableExistingRecordIdentifier;
  }

  recordDataFor(identifier: StableRecordIdentifier | { type: string }, isCreate: boolean): RecordData {
    let recordData: RecordData;
    if (isCreate === true) {
      // TODO remove once InternalModel is no longer essential to internal state
      // and just build a new identifier directly
      let internalModel = internalModelFactoryFor(this.store).build({ type: identifier.type, id: null });
      let stableIdentifier = internalModel.identifier;
      recordData = this.getRecordData(stableIdentifier);
      recordData.clientDidCreate();
      this.store.recordArrayManager.recordDidChange(stableIdentifier);
    } else {
      // TODO remove once InternalModel is no longer essential to internal state
      internalModelFactoryFor(this.store).lookup(identifier as StableRecordIdentifier);
      recordData = this.getRecordData(identifier as StableRecordIdentifier);
    }

    return recordData;
  }
}

function assertRecordsPassedToHasMany(records: RecordInstance[]) {
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
