import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordData } from '../ts-interfaces/record-data';
import type { RecordInstance } from '../ts-interfaces/record-instance';
import WeakCache from './weak-cache';

/*
 * Returns the RecordData instance associated with a given
 * Model or Identifier
 */

const RecordDataForIdentifierCache = new WeakCache<StableRecordIdentifier | RecordInstance, RecordData>(
  DEBUG ? 'recordData' : ''
);

export function setRecordDataFor(identifier: StableRecordIdentifier | RecordInstance, recordData: RecordData): void {
  assert(
    `Illegal set of identifier`,
    !RecordDataForIdentifierCache.has(identifier) || RecordDataForIdentifierCache.get(identifier) === recordData
  );
  RecordDataForIdentifierCache.set(identifier, recordData);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier): void {
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
