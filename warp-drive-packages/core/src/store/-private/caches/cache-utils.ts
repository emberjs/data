import { assert } from '@warp-drive/core/build-config/macros';

import { getOrSetGlobal } from '../../../types/-private.ts';
import type { Cache } from '../../../types/cache.ts';
import type { StableRecordIdentifier } from '../../../types/identifier.ts';

/*
 * Returns the Cache instance associated with a given
 * Identifier
 *
 * This can be removed if we refactor `isNew` in the graph
 * to either get the cache a different way or not be required anymore.
 */

export const CacheForIdentifierCache: Map<unknown, Cache> = getOrSetGlobal(
  'CacheForIdentifierCache',
  new Map<StableRecordIdentifier, Cache>()
);

export function setCacheFor(identifier: StableRecordIdentifier, cache: Cache): void {
  assert(
    `Illegal set of identifier`,
    !CacheForIdentifierCache.has(identifier) || CacheForIdentifierCache.get(identifier) === cache
  );
  CacheForIdentifierCache.set(identifier, cache);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier): void {
  CacheForIdentifierCache.delete(identifier);
}

export function peekCache(instance: StableRecordIdentifier): Cache | null {
  if (CacheForIdentifierCache.has(instance)) {
    return CacheForIdentifierCache.get(instance) as Cache;
  }

  return null;
}
