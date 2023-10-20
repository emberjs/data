import { StableRecordIdentifier } from '../q/identifier';
import { StableDocumentIdentifier } from './identifier';

export interface Change {
  identifier: StableRecordIdentifier | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
