import InternalModel from '../model/internal-model';
import Store from '../store';
import { recordIdentifiersFor } from './record-identifier';
import { LegacyRecordIdentifier } from 'ember-data/-private/types';

type TStore = InstanceType<typeof Store>;
type TIdentifier = LegacyRecordIdentifier;

const INTERNAL_MODEL_CACHE = new WeakMap<TIdentifier, InternalModel>();
const IM_TYPES = Object.create(null);

export function internalModelFor(identifier): InternalModel | null {
  return INTERNAL_MODEL_CACHE.get(identifier) || null;
}

export function internalModelsFor(store: TStore, type: string): InternalModel[] {
  let identifiers = recordIdentifiersFor(store, type);
  let internalModels: InternalModel[] = [];

  for (let i = 0; i < identifiers.length; i++) {
    let internalModel = internalModelFor(identifiers[i]);

    if (internalModel !== null) {
      internalModels.push(internalModel);
    }
  }

  return internalModels;
}

export function setInternalModelFor(
  identifier: LegacyRecordIdentifier,
  internalModel: InternalModel | null
): void {
  if (internalModel === null) {
    INTERNAL_MODEL_CACHE.delete(identifier);
  } else {
    IM_TYPES[identifier.type] = true;
    INTERNAL_MODEL_CACHE.set(identifier, internalModel);
  }
}

export function clearInternalModels(store: TStore, type?: string): void {
  let all;
  if (typeof type === 'string' && type.length > 0) {
    all = internalModelsFor(store, type);
  } else {
    all = [];
    Object.keys(IM_TYPES).forEach(type => {
      all.push(...internalModelsFor(store, type));
    });
  }

  for (let i = 0; i < all.length; i++) {
    let internalModel = all[i];
    // TODO the store or some such should initiate this not the internalModel
    //  so that we can properly handle encapsulation with RecordData
    internalModel.unloadRecord();
    // TODO do we need to remove mapping here ourselves?
    // TODO ^ RE we probably should vs relying on unloadRecord doing it later
  }
}
