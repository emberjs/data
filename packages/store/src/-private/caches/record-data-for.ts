import { assert } from '@ember/debug';

import type { Cache } from '@ember-data/types/q/cache';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

/*
 * Returns the RecordData instance associated with a given
 * Model or Identifier
 */

const RecordDataForIdentifierCache = new Map<StableRecordIdentifier | RecordInstance, Cache>();

export function setRecordDataFor(identifier: StableRecordIdentifier | RecordInstance, recordData: Cache): void {
  assert(
    `Illegal set of identifier`,
    !RecordDataForIdentifierCache.has(identifier) || RecordDataForIdentifierCache.get(identifier) === recordData
  );
  RecordDataForIdentifierCache.set(identifier, recordData);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier | RecordInstance): void {
  RecordDataForIdentifierCache.delete(identifier);
}

export default function recordDataFor(instance: StableRecordIdentifier): Cache | null;
export default function recordDataFor(instance: RecordInstance): Cache;
export default function recordDataFor(instance: StableRecordIdentifier | RecordInstance): Cache | null {
  if (RecordDataForIdentifierCache.has(instance as StableRecordIdentifier)) {
    return RecordDataForIdentifierCache.get(instance as StableRecordIdentifier) as Cache;
  }

  return null;
}
