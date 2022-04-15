import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordData } from '../ts-interfaces/record-data';
import type { RecordInstance } from '../ts-interfaces/record-instance';
import WeakCache from './weak-cache';

/*
 * Returns the RecordData instance associated with a given
 * Model or InternalModel.
 *
 * Intentionally "loose" to allow anything with an _internalModel
 * property until InternalModel is eliminated.
 *
 * Intentionally not typed to `InternalModel` due to circular dependency
 *  which that creates.
 *
 * Overtime, this should shift to a "weakmap" based lookup in the
 *  "Ember.getOwner(obj)" style.
 */
interface InternalModel {
  _recordData: RecordData;
}

type DSModelOrSnapshot = { _internalModel: InternalModel };
type Reference = { internalModel: InternalModel };

type Instance = StableRecordIdentifier | InternalModel | RecordData | DSModelOrSnapshot | Reference;

const RecordDataForIdentifierCache = new WeakCache<StableRecordIdentifier, RecordData>(DEBUG ? 'recordData' : '');

export function setRecordDataFor(identifier: StableRecordIdentifier, recordData: RecordData): void {
  assert(`Illegal set of identifier`, !RecordDataForIdentifierCache.has(identifier));
  RecordDataForIdentifierCache.set(identifier, recordData);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier): void {
  RecordDataForIdentifierCache.delete(identifier);
}

export default function recordDataFor(instance: StableRecordIdentifier): RecordData | null;
export default function recordDataFor(instance: Instance): RecordData;
export default function recordDataFor(instance: RecordInstance): RecordData;
export default function recordDataFor(instance: object): null;
export default function recordDataFor(instance: Instance | object): RecordData | null {
  if (RecordDataForIdentifierCache.has(instance as StableRecordIdentifier)) {
    return RecordDataForIdentifierCache.get(instance as StableRecordIdentifier) as RecordData;
  }
  let internalModel =
    (instance as DSModelOrSnapshot)._internalModel || (instance as Reference).internalModel || instance;

  return internalModel._recordData || null;
}
