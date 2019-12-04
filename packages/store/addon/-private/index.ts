/**
  @module @ember-data/store
*/

export { default as Store } from './system/ds-model-store';

export { recordIdentifierFor } from './system/store/internal-model-factory';
export {
  identifierCacheFor,
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
} from './identifiers/cache';

// private, but here for re-export in the ember-data package
// somewhat used by tests
export { default as Snapshot } from './system/snapshot';
export { default as normalizeModelName } from './system/normalize-model-name';
export { default as coerceId } from './system/coerce-id';
export { errorsHashToArray, errorsArrayToHash } from './system/errors-utils';
export { default as RootState } from './system/model/states';
export { default as InternalModel } from './system/model/internal-model';
export { PromiseArray, PromiseObject } from './system/promise-proxies';
export { RecordArray, AdapterPopulatedRecordArray } from './system/record-arrays';
export { default as RecordArrayManager } from './system/record-array-manager';

// only used by tests
export { default as SnapshotRecordArray } from './system/snapshot-record-array';

// New
export { default as recordDataFor } from './system/record-data-for';
export { _objectIsAlive } from './system/store/common';

// for Model
export { default as diffArray } from './system/diff-array';
export { default as DeprecatedEvented } from './system/deprecated-evented';
export { BRAND_SYMBOL } from './ts-interfaces/utils/brand';
