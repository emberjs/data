import { StableRecordIdentifier } from '@ember-data/types/q/identifier';

import { StableDocumentIdentifier } from './identifier';

export interface Change {
  identifier: StableRecordIdentifier | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
