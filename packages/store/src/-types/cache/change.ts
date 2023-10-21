import { StableRecordIdentifier } from '@warp-drive/core-types';

import { StableDocumentIdentifier } from './identifier';

export interface Change {
  identifier: StableRecordIdentifier | StableDocumentIdentifier;
  op: 'upsert' | 'remove';
  patch?: unknown;
}
