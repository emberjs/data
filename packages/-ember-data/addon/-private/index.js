// public
export { default as Store } from '@ember-data/store';
export { default as DS } from './core';
export { Errors } from '@ember-data/model/-private';
export { Snapshot } from '@ember-data/store/-private';

// `ember-data-model-fragments` relies on `RootState` and `InternalModel`
// `ember-data-model-fragments' and `ember-data-change-tracker` rely on `normalizeModelName`
export {
  AdapterPopulatedRecordArray,
  InternalModel,
  PromiseArray,
  PromiseObject,
  RecordArray,
  RecordArrayManager,
  RootState,
  SnapshotRecordArray,
  normalizeModelName,
  coerceId,
} from '@ember-data/store/-private';
export { ManyArray, PromiseManyArray } from '@ember-data/model/-private';
export { RecordData, Relationship } from '@ember-data/record-data/-private';
