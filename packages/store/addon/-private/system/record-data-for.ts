import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordData } from '../ts-interfaces/record-data';

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

const IdentifierCache = new WeakMap<StableRecordIdentifier, RecordData>();

export function setRecordDataFor(identifier: StableRecordIdentifier, recordData: RecordData) {
  assert(`Illegal set of identifier`, !IdentifierCache.has(identifier));
  IdentifierCache.set(identifier, recordData);
}

export function removeRecordDataFor(identifier) {
  IdentifierCache.delete(identifier);
}

export default function recordDataFor(instance: StableRecordIdentifier): RecordData | null;
export default function recordDataFor(instance: Instance): RecordData;
export default function recordDataFor(instance: object): null;
export default function recordDataFor(instance: Instance | object): RecordData | null {
  if (IdentifierCache.has(instance as StableRecordIdentifier)) {
    return IdentifierCache.get(instance as StableRecordIdentifier) as RecordData;
  }
  let internalModel =
    (instance as DSModelOrSnapshot)._internalModel || (instance as Reference).internalModel || instance;

  return internalModel._recordData || null;
}
