import type { RequestKey, ResourceKey } from '../identifier.ts';

export interface Change {
  identifier: ResourceKey | RequestKey;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
