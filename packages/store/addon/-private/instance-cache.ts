import type { CreateRecordProperties } from './system/core-store';
import CoreStore from './system/core-store';
import type { StableRecordIdentifier } from './ts-interfaces/identifier';
import type { RecordInstance } from './ts-interfaces/record-instance';

export class InstanceCache {
  declare store: CoreStore;

  #records = new WeakMap<StableRecordIdentifier, RecordInstance>();

  constructor(store: CoreStore) {
    this.store = store;
  }

  getRecord(identifier: StableRecordIdentifier, properties?: CreateRecordProperties): RecordInstance {
    let record = this.#records.get(identifier);

    // TODO how to handle dematerializing

    if (!record) {
      if (properties && properties.id) {
        this.getInternalModel(identifier).setId(properties.id);
      }

      record = this.store._instantiateRecord(this.getRecordData(identifier), identifier, properties);
      this.#records.set(identifier, record);
    }

    return record;
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
