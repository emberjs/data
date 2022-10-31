/**
  @module @ember-data/store
*/

import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_HELPERS } from '@ember-data/private-build-infra/deprecations';

import _normalize from './utils/normalize-model-name';

export { default as Store, storeFor } from './store-service';

export { recordIdentifierFor } from './caches/instance-cache';

export { default as Snapshot } from './network/snapshot';
export {
  setIdentifierGenerationMethod,
  setIdentifierUpdateMethod,
  setIdentifierForgetMethod,
  setIdentifierResetMethod,
  isStableIdentifier,
} from './caches/identifier-cache';

export function normalizeModelName(modelName: string) {
  if (DEPRECATE_HELPERS) {
    deprecate(
      `the helper function normalizeModelName is deprecated. You should use model names that are already normalized, or use string helpers of your own. This function is primarily an alias for dasherize from @ember/string.`,
      false,
      {
        id: 'ember-data:deprecate-normalize-modelname-helper',
        for: 'ember-data',
        until: '5.0',
        since: { available: '4.7', enabled: '4.7' },
      }
    );
    return _normalize(modelName);
  }
  assert(`normalizeModelName support has been removed`);
}

// TODO this should be a deprecated helper but we have so much usage of it
// to also eliminate
export { default as coerceId } from './utils/coerce-id';

export {
  default as RecordArray,
  default as IdentifierArray,
  Collection as AdapterPopulatedRecordArray,
  SOURCE,
  MUTATE,
  IDENTIFIER_ARRAY_TAG,
} from './record-arrays/identifier-array';
export { default as RecordArrayManager, fastPush } from './managers/record-array-manager';

// // Used by tests
export { default as SnapshotRecordArray } from './network/snapshot-record-array';

// leaked for private use / test use, should investigate removing
export { default as recordDataFor, removeRecordDataFor } from './caches/record-data-for';
