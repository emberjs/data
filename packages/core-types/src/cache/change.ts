import type { StableDocumentIdentifier, StableRecordIdentifier } from '../identifier';

export interface Change {
  identifier: StableRecordIdentifier | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
