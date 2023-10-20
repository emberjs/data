import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@warp-drive/core/identifier';

import type { Cache } from '../../-types/q/cache';
import type { RecordInstance } from '../../-types/q/record-instance';

/*
 * Returns the Cache instance associated with a given
 * Model or Identifier
 */

export const CacheForIdentifierCache = new Map<StableRecordIdentifier | RecordInstance, Cache>();

export function setCacheFor(identifier: StableRecordIdentifier | RecordInstance, cache: Cache): void {
  assert(
    `Illegal set of identifier`,
    !CacheForIdentifierCache.has(identifier) || CacheForIdentifierCache.get(identifier) === cache
  );
  CacheForIdentifierCache.set(identifier, cache);
}

export function removeRecordDataFor(identifier: StableRecordIdentifier | RecordInstance): void {
  CacheForIdentifierCache.delete(identifier);
}

export default function peekCache(instance: StableRecordIdentifier): Cache | null;
export default function peekCache(instance: RecordInstance): Cache;
export default function peekCache(instance: StableRecordIdentifier | RecordInstance): Cache | null {
  if (CacheForIdentifierCache.has(instance as StableRecordIdentifier)) {
    return CacheForIdentifierCache.get(instance as StableRecordIdentifier) as Cache;
  }

  return null;
}
