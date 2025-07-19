import type { ResourceKey,StableDocumentIdentifier } from '../identifier.ts';

export interface Change {
  identifier: ResourceKey | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
