/**
  @module @ember-data/store
*/

export { default as Store, storeFor } from './core-store';

export { recordIdentifierFor } from './store/internal-model-factory';

export { default as Snapshot } from './snapshot';
export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
} from './identifier-cache';

export { default as normalizeModelName } from './normalize-model-name';
export { default as coerceId } from './coerce-id';

export { errorsHashToArray, errorsArrayToHash } from './errors-utils';

// `ember-data-model-fragments` relies on `InternalModel`
export { default as InternalModel } from './model/internal-model';

export { PromiseArray, PromiseObject, deprecatedPromiseObject } from './promise-proxies';

export { RecordArray, AdapterPopulatedRecordArray } from './record-arrays';

export { default as RecordArrayManager } from './record-array-manager';

// // Used by tests
export { default as SnapshotRecordArray } from './snapshot-record-array';

// New
export { default as recordDataFor, removeRecordDataFor } from './record-data-for';
export { default as RecordDataStoreWrapper } from './store/record-data-store-wrapper';

export { default as WeakCache } from './weak-cache';
