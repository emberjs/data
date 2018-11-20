import { DEBUG } from '@glimmer/env';

// TODO is there a way to import classes without causing cyclical imports for rollup?
//   maybe strip "typing" imports prior to rollup?
type InternalModel = object;
type CreateOptions = object;
type Record = object;
type RecordData = object;

type Mappable = InternalModel | CreateOptions | Record;

const RecordDataMap = new WeakMap<Mappable, RecordData>();

export function getRecordDataFor(instance: Mappable): RecordData | null {
  let recordData = RecordDataMap.get(instance);

  if (DEBUG) {
    if (recordData === undefined) {
      throw new Error(
        `Attempted to retrieve the RecordData mapped to ${instance} but no mapping exists!`
      );
    }
  }

  return recordData || null;
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
