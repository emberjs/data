/**
  @module @ember-data/store
*/

import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_HELPERS } from '@ember-data/private-build-infra/deprecations';

import _normalize from './normalize-model-name';

export { default as Store, storeFor } from './core-store';

export { recordIdentifierFor } from './internal-model-factory';

export { default as Snapshot } from './snapshot';
export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
} from './identifier-cache';

export function normalizeModelName(modelName: string) {
  if (DEPRECATE_HELPERS) {
    deprecate(
      `the helper function normalizeModelName is deprecated. You should use model names that are already normalized, or use string helpers of your own. This function is primarily an alias for dasherize from @ember/string.`,
      false,
      {
        id: 'ember-data:deprecate-normalize-modelname-helper',
        for: 'ember-data',
        until: '5.0',
        since: { available: '4.8', enabled: '4.8' },
      }
    );
    return _normalize(modelName);
  }
  assert(`normalizeModelName support has been removed`);
}

export { default as coerceId } from './coerce-id';

export { errorsHashToArray, errorsArrayToHash } from './errors-utils';

// `ember-data-model-fragments` relies on `InternalModel`
export { default as InternalModel } from './model/internal-model';

export { PromiseArray, PromiseObject, deprecatedPromiseObject } from './promise-proxies';

export { default as RecordArray } from './record-arrays/record-array';
export { default as AdapterPopulatedRecordArray } from './record-arrays/adapter-populated-record-array';

export { default as RecordArrayManager } from './record-array-manager';

// // Used by tests
export { default as SnapshotRecordArray } from './snapshot-record-array';

// New
export { default as recordDataFor, removeRecordDataFor } from './record-data-for';
export { default as RecordDataStoreWrapper } from './record-data-store-wrapper';

export { default as WeakCache } from './weak-cache';
