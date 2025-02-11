/**
  @module @ember-data/store
*/
import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_HELPERS } from '@warp-drive/build-config/deprecations';

import { normalizeModelName as _normalize } from './-private/utils/normalize-model-name';

export { Store, storeFor } from './-private/store-service';

export { recordIdentifierFor } from './-private/caches/instance-cache';

export { CacheHandler, type StoreRequestContext } from './-private/cache-handler/handler';
export { type CachePolicy } from './-private/cache-handler/types';

export { isStableIdentifier } from './-private/caches/identifier-cache';

export { constructResource } from './-private/utils/construct-resource';

export type { Document } from './-private/document';
export type { InstanceCache } from './-private/caches/instance-cache';

export type {
  FindRecordQuery,
  Request,
  SaveRecordMutation,
  RequestState,
  RequestStateService,
} from './-private/network/request-cache';

export type { CreateRecordProperties } from './-private/store-service';

// TODO this should be a deprecated helper but we have so much usage of it
// to also eliminate
export { coerceId, ensureStringId } from './-private/utils/coerce-id';
export type { NativeProxy } from './-private/record-arrays/native-proxy-type-fix';
export {
  IdentifierArray as LiveArray,
  Collection as CollectionRecordArray,
  notifyArray,
  SOURCE,
  MUTATE,
  ARRAY_SIGNAL,
} from './-private/record-arrays/identifier-array';
export { RecordArrayManager, fastPush } from './-private/managers/record-array-manager';

// leaked for private use / test use, should investigate removing
export { _clearCaches } from './-private/caches/instance-cache';
export { peekCache, removeRecordDataFor } from './-private/caches/cache-utils';

// @ember-data/model needs these temporarily
export { setRecordIdentifier, StoreMap } from './-private/caches/instance-cache';
export { setCacheFor } from './-private/caches/cache-utils';
export type { StoreRequestInput } from './-private/cache-handler/handler';

/**
 This method normalizes a modelName into the format EmberData uses
 internally by dasherizing it.

  @method normalizeModelName
  @static
  @public
  @deprecated
  @for @ember-data/store
  @param {String} modelName
  @return {String} normalizedModelName
*/
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
