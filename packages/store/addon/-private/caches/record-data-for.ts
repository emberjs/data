import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordData } from '@ember-data/types/q/record-data';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

/*
 * Returns the RecordData instance associated with a given
 * Model or Identifier
 */

const RecordDataForIdentifierCache = new Map<StableRecordIdentifier | RecordInstance, RecordData>();

export function setRecordDataFor(identifier: StableRecordIdentifier | RecordInstance, recordData: RecordData): void {
  assert(
    `Illegal set of identifier`,
    !RecordDataForIdentifierCache.has(identifier) || RecordDataForIdentifierCache.get(identifier) === recordData
  );
  RecordDataForIdentifierCache.set(identifier, recordData);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier | RecordInstance): void {
  RecordDataForIdentifierCache.delete(identifier);
}

export default function recordDataFor(instance: StableRecordIdentifier): RecordData | null;
export default function recordDataFor(instance: RecordInstance): RecordData;
export default function recordDataFor(instance: StableRecordIdentifier | RecordInstance): RecordData | null {
  if (RecordDataForIdentifierCache.has(instance as StableRecordIdentifier)) {
    return RecordDataForIdentifierCache.get(instance as StableRecordIdentifier) as RecordData;
  }

  return null;
}
