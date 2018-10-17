import { recordIdentifierFor } from './identifier-index';

// stores back references for records, recordIdentifiers and internalModels
const INTERNAL_MODEL_CACHE = new WeakMap();

// TODO this is horrible for perf, perhaps we can make out index store
//   this info alongside for now until we kill the need for "all-of-type"
export function internalModelsFor(index, type) {
  let dict = type ?
    index.getFromIndex('json-api-type', [type]) :
    index.getFromIndex('json-api-lid', []);
  let internalModels = [];
  if (dict === undefined) {
    return internalModels;
  }
  let lids = Object.keys(dict);

  for (let i = 0; i < lids.length; i++) {
    let internalModel = internalModelFor(dict[lids[i]]);

    if (internalModel !== undefined) {
      internalModels.push(internalModel);
    }
  }

  return internalModels;
}

export function clearInternalModels(index, modelName) {
  let all = internalModelsFor(index, modelName);

  for (let i = 0; i < all.length; i++) {
    let internalModel = all[i];
    // TODO the store or some such should initiate this not the internalModel
    //  so that we can properly handle encapsulation with RecordData
    internalModel.unloadRecord();
    // TODO do we need to remove mapping here ourselves?
    // TODO ^ RE we probably should vs relying on unloadRecord doing it later
  }
}

export function setInternalModelFor(obj, internalModel) {
  if (internalModel === null) {
    INTERNAL_MODEL_CACHE.delete(obj);
  } else {
    INTERNAL_MODEL_CACHE.set(obj, internalModel);
  }
}

export function internalModelFor(identifier) {
  let internalModel = INTERNAL_MODEL_CACHE.get(identifier);

  // TODO don't allow this fallback
  if (internalModel === undefined) {
    let recordIdentifier = recordIdentifierFor(identifier);

    internalModel = INTERNAL_MODEL_CACHE.get(recordIdentifier)
  }

  return internalModel;
}
