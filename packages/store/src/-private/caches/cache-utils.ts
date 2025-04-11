import { assert } from '@warp-drive/build-config/macros';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { Cache } from '@warp-drive/core-types/cache';
import type { ResourceCacheKey } from '@warp-drive/core-types/identifier';

import type { OpaqueRecordInstance } from '../../-types/q/record-instance';

/*
 * Returns the Cache instance associated with a given
 * Model or Identifier
 */

export const CacheForIdentifierCache = getOrSetGlobal(
  'CacheForIdentifierCache',
  new Map<ResourceCacheKey | OpaqueRecordInstance, Cache>()
);

export function setCacheFor(identifier: ResourceCacheKey | OpaqueRecordInstance, cache: Cache): void {
  assert(
    `Illegal set of identifier`,
    !CacheForIdentifierCache.has(identifier) || CacheForIdentifierCache.get(identifier) === cache
  );
  CacheForIdentifierCache.set(identifier, cache);
}

export function removeRecordDataFor(identifier: ResourceCacheKey | OpaqueRecordInstance): void {
  CacheForIdentifierCache.delete(identifier);
}

export function peekCache(instance: ResourceCacheKey): Cache | null;
export function peekCache(instance: OpaqueRecordInstance): Cache;
export function peekCache(instance: ResourceCacheKey | OpaqueRecordInstance): Cache | null {
  if (CacheForIdentifierCache.has(instance as ResourceCacheKey)) {
    return CacheForIdentifierCache.get(instance as ResourceCacheKey) as Cache;
  }

  return null;
}
