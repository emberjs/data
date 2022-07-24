import { assert } from '@ember/debug';

import type { CreateRecordProperties } from './system/core-store';
import CoreStore from './system/core-store';
import type { StableRecordIdentifier } from './ts-interfaces/identifier';
import type { RecordInstance } from './ts-interfaces/record-instance';

type Caches = {
  record: WeakMap<StableRecordIdentifier, RecordInstance>;
};
export class InstanceCache {
  declare store: CoreStore;

  #instances: Caches = {
    record: new WeakMap<StableRecordIdentifier, RecordInstance>(),
  };

  constructor(store: CoreStore) {
    this.store = store;
  }

  peek({ identifier, bucket }: { identifier: StableRecordIdentifier; bucket: 'record' }): RecordInstance | undefined {
    return this.#instances[bucket].get(identifier);
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

    // TODO how to handle dematerializing

    if (!record) {
      if (properties && 'id' in properties) {
        assert(`expected id to be a string or null`, properties.id !== undefined);
        this.getInternalModel(identifier).setId(properties.id);
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
    return this.getInternalModel(identifier)._recordData;
  }

  // TODO move InternalModel cache into InstanceCache
  getInternalModel(identifier: StableRecordIdentifier) {
    return this.store._internalModelForResource(identifier);
  }
}
