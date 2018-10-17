import { recordIdentifierFor } from './identifier-index';

// stores back references for records, recordI and internalModels
export const RECORD_DATA_CACHE = new WeakMap();

export function setRecordDataFor(obj, recordData) {
  RECORD_DATA_CACHE.set(obj, recordData);
}

export function recordDataFor(identifier) {
  let recordData = RECORD_DATA_CACHE.get(identifier);

  // TODO don't allow this fallback
  if (recordData === undefined) {
    let recordIdentifier = recordIdentifierFor(identifier);

    recordData = RECORD_DATA_CACHE.get(recordIdentifier)
  }

  return recordData;
}
