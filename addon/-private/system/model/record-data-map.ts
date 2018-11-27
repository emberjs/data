import { DEBUG } from '@glimmer/env';

/**
 * Generally we use a WeakMap to store the 1:1 mapping between
 * Record/CreateOptions and RecordData.
 *
 * However, we have no guarantee that the CreateOptions we pass to
 * `factory.create(createOptions)` are the same object that we receive
 * as the first arg to `Model.init()` (in fact, they are not!).
 *
 * For this reason, we use this randomly generated string key to store
 * the mapping for CreateOptions. This maintains isolation without
 * resulting in a performance hit.
 */
export const RECORD_DATA_KEY = `${Date.now()}-record-data`;

// TODO TS: create a specific interface
type CreateOptions = object;
// TODO TS: create a specific interface
type Record = object;
// TODO TS: create a specific interface
type RecordData = {
  hasAttr(key);
  getAttr(key);
  setDirtyAttribute(key, value);
  isAttrDirty(key);
};

type Mappable = CreateOptions | Record;

const RecordDataMap = new WeakMap<Mappable, RecordData>();

export function getRecordDataFor(instance: Mappable): RecordData {
  let recordData = RecordDataMap.get(instance);

  if (recordData === undefined) {
    if (instance[RECORD_DATA_KEY] !== undefined) {
      return instance[RECORD_DATA_KEY];
    }

    // TODO can we strip this in prod without throwing Typescript Errors?
    debugger;
    throw new Error(
      `Attempted to retrieve the RecordData mapped to ${instance} but no mapping exists!`
    );
  }

  return recordData;
}

export function setRecordDataFor(instance: Mappable, recordData: RecordData): void {
  if (DEBUG) {
    let existing = RecordDataMap.get(instance);
    if (existing !== undefined) {
      // even re-setting to the same instance is a mistake
      if (existing === recordData) {
        throw new Error(
          `Attempting to create RecordData mapping for ${instance} but this same mapping has already been created!`
        );
      }
      throw new Error(
        `Cannot create RecordData mapping for ${instance} as a different mapping already exists!`
      );
    }
  }
  RecordDataMap.set(instance, recordData);
}
