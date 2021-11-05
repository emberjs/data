/**
  @module @ember-data/store
*/

export { default as Store } from './system/ds-model-store';

export { recordIdentifierFor } from './system/store/internal-model-factory';

export { default as Snapshot } from './system/snapshot';
export {
  identifierCacheFor,
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
} from './identifiers/cache';

export { default as normalizeModelName } from './system/normalize-model-name';
export { default as coerceId } from './system/coerce-id';

export { errorsHashToArray, errorsArrayToHash } from './system/errors-utils';

// `ember-data-model-fragments` relies on `RootState` and `InternalModel`
export { default as RootState } from './system/model/states';
export { default as InternalModel } from './system/model/internal-model';

export { PromiseArray, PromiseObject } from './system/promise-proxies';

export { RecordArray, AdapterPopulatedRecordArray } from './system/record-arrays';

export { default as RecordArrayManager } from './system/record-array-manager';

// // Used by tests
export { default as SnapshotRecordArray } from './system/snapshot-record-array';

// New
export { default as recordDataFor, removeRecordDataFor } from './system/record-data-for';
export { default as RecordDataStoreWrapper } from './system/store/record-data-store-wrapper';

// for Model
export { default as DeprecatedEvented } from './system/deprecated-evented';
