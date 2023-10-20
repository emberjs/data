import { StableRecordIdentifier } from '@warp-drive/core';

import { StableDocumentIdentifier } from './identifier';

export interface Change {
  identifier: StableRecordIdentifier | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
