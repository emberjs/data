import type { StableDocumentIdentifier, StableRecordIdentifier } from '../identifier.ts';

export interface Change {
  identifier: StableRecordIdentifier | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
