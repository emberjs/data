import type { ResourceKey, RequestKey } from '../identifier.ts';

export interface Change {
  identifier: ResourceKey | RequestKey;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
