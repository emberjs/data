import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { RecordType, RegistryMap, ResolvedRegistry } from '@ember-data/types';

import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordData } from '../ts-interfaces/record-data';
import type { RecordInstance } from '../ts-interfaces/record-instance';
import type InternalModel from './model/internal-model';
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

type DSModelOrSnapshot<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>> = {
  _internalModel: InternalModel<R, T>;
};
type Reference<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>> = {
  internalModel: InternalModel<R, T>;
};

type Instance<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>> =
  | StableRecordIdentifier<T>
  | InternalModel<R, T>
  | RecordData<R, T>
  | DSModelOrSnapshot<R, T>
  | Reference<R, T>;

const RecordDataForIdentifierCache = new WeakCache<StableRecordIdentifier, object>(DEBUG ? 'recordData' : '');

export function setRecordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  identifier: StableRecordIdentifier<T>,
  recordData: RecordData<R, T>
): void {
  assert(`Illegal set of identifier`, !RecordDataForIdentifierCache.has(identifier));
  RecordDataForIdentifierCache.set(identifier, recordData);
}

export function removeRecordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  identifier: StableRecordIdentifier<T>
): void {
  RecordDataForIdentifierCache.delete(identifier);
}

export default function recordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  instance: StableRecordIdentifier<T>
): RecordData<R, T> | null;
export default function recordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  instance: Instance<R, T>
): RecordData<R, T>;
export default function recordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  instance: RecordInstance
): RecordData<R, T>;
export default function recordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  instance: object
): null;
export default function recordDataFor<R extends ResolvedRegistry<RegistryMap>, T extends RecordType<R>>(
  instance: Instance<R, T> | object
): RecordData<R, T> | null {
  if (RecordDataForIdentifierCache.has(instance as StableRecordIdentifier<T>)) {
    return RecordDataForIdentifierCache.get(instance as StableRecordIdentifier<T>) as RecordData<R, T>;
  }
  let internalModel =
    (instance as DSModelOrSnapshot<R, T>)._internalModel || (instance as Reference<R, T>).internalModel || instance;

  return internalModel._recordData || null;
}
