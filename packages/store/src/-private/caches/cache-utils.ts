import { assert } from '@warp-drive/build-config/macros';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { Cache } from '@warp-drive/core-types/cache';
import type { StableRecordIdentifier } from '@warp-drive/core-types/identifier';

import type { OpaqueRecordInstance } from '../../-types/q/record-instance';

/*
 * Returns the Cache instance associated with a given
 * Model or Identifier
 */

export const CacheForIdentifierCache = getOrSetGlobal(
  'CacheForIdentifierCache',
  new Map<StableRecordIdentifier | OpaqueRecordInstance, Cache>()
);

export function setCacheFor(identifier: StableRecordIdentifier | OpaqueRecordInstance, cache: Cache): void {
  assert(
    `Illegal set of identifier`,
    !CacheForIdentifierCache.has(identifier) || CacheForIdentifierCache.get(identifier) === cache
  );
  CacheForIdentifierCache.set(identifier, cache);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier | OpaqueRecordInstance): void {
  CacheForIdentifierCache.delete(identifier);
}

export function peekCache(instance: StableRecordIdentifier): Cache | null;
export function peekCache(instance: OpaqueRecordInstance): Cache;
export function peekCache(instance: StableRecordIdentifier | OpaqueRecordInstance): Cache | null {
  if (CacheForIdentifierCache.has(instance as StableRecordIdentifier)) {
    return CacheForIdentifierCache.get(instance as StableRecordIdentifier) as Cache;
  }

  return null;
}
