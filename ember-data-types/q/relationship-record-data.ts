import type BelongsToRelationship from '@ember-data/record-data/-private/relationships/state/belongs-to';

import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { StableRecordIdentifier } from './identifier';
import type { RecordData } from './record-data';
import type { RecordDataStoreWrapper } from './record-data-store-wrapper';

export interface DefaultSingleResourceRelationship extends SingleResourceRelationship {
  _relationship: BelongsToRelationship;
}

export interface RelationshipRecordData extends RecordData {
  storeWrapper: RecordDataStoreWrapper;
  identifier: StableRecordIdentifier;
  getBelongsTo(key: string): DefaultSingleResourceRelationship;
  getHasMany(key: string): CollectionResourceRelationship;
}
