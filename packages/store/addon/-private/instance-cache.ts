import { assert } from '@ember/debug';

import type { CreateRecordProperties } from './system/core-store';
import CoreStore from './system/core-store';
import Snapshot from './system/snapshot';
import type { StableRecordIdentifier } from './ts-interfaces/identifier';
import { RecordData } from './ts-interfaces/record-data';
import type { RecordInstance } from './ts-interfaces/record-instance';
import { FindOptions } from './ts-interfaces/store';

type Caches = {
  record: WeakMap<StableRecordIdentifier, RecordInstance>;
  recordData: WeakMap<StableRecordIdentifier, RecordData>;
};
export class InstanceCache {
  declare store: CoreStore;

  #instances: Caches = {
    record: new WeakMap<StableRecordIdentifier, RecordInstance>(),
    recordData: new WeakMap<StableRecordIdentifier, RecordData>(),
  };

  constructor(store: CoreStore) {
    this.store = store;
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

      record = this.store._instantiateRecord(this.getRecordData(identifier), identifier, properties);
      this.set({ identifier, bucket: 'record', value: record });
    }

    return record;
  }

  removeRecord(identifier: StableRecordIdentifier): boolean {
    let record = this.peek({ identifier, bucket: 'record' });

    if (record) {
      this.#instances.record.delete(identifier);
      this.store._teardownRecord(record);
    }

    return !!record;
  }

  // TODO move RecordData Cache into InstanceCache
  getRecordData(identifier: StableRecordIdentifier) {
    let recordData = this.peek({ identifier, bucket: 'recordData' });

    if (!recordData) {
      recordData = this.store._createRecordData(identifier);
      this.#instances.recordData.set(identifier, recordData);
      this.getInternalModel(identifier).hasRecordData = true;
    }

    return recordData;
  }

  // TODO move InternalModel cache into InstanceCache
  getInternalModel(identifier: StableRecordIdentifier) {
    return this.store._internalModelForResource(identifier);
  }

  createSnapshot(identifier: StableRecordIdentifier, options: FindOptions = {}): Snapshot {
    return new Snapshot(options, identifier, this.store);
  }
}
