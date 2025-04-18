import type { RequestCacheKey, ResourceCacheKey } from '../identifier';

export interface Change {
  identifier: ResourceCacheKey | RequestCacheKey;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
