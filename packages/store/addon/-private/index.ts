/**
  @module @ember-data/store
*/

export { default as Store } from './system/ds-model-store';

export { recordIdentifierFor } from './system/store/internal-model-factory';

export { default as Snapshot } from './system/snapshot';
export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
} from './identifiers/cache';

export { default as normalizeModelName } from './system/normalize-model-name';
export { default as coerceId } from './system/coerce-id';

export { errorsHashToArray, errorsArrayToHash } from './system/errors-utils';

// `ember-data-model-fragments` relies on `InternalModel`
export { default as InternalModel } from './system/model/internal-model';

export { PromiseArray, PromiseObject, deprecatedPromiseObject } from './system/promise-proxies';

export { RecordArray, AdapterPopulatedRecordArray } from './system/record-arrays';

export { default as RecordArrayManager } from './system/record-array-manager';

// // Used by tests
export { default as SnapshotRecordArray } from './system/snapshot-record-array';

// New
export { default as recordDataFor, removeRecordDataFor } from './system/record-data-for';
export { default as RecordDataStoreWrapper } from './system/store/record-data-store-wrapper';

export { default as WeakCache } from './system/weak-cache';
