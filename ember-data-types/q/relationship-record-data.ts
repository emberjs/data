import type BelongsToRelationship from '@ember-data/record-data/-private/relationships/state/belongs-to';

import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from './identifier';
import type { RecordData } from './record-data';
import type { RecordDataStoreWrapper } from './record-data-store-wrapper';

export interface DefaultSingleResourceRelationship extends SingleResourceRelationship {
  _relationship: BelongsToRelationship;
}

export interface RelationshipRecordData extends RecordData {
  //Required by the relationship layer
  isNew(): boolean;
  modelName: string;
  storeWrapper: RecordDataStoreWrapper;
  identifier: StableRecordIdentifier;
  id: string | null;
  lid: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): RecordIdentifier;
  getBelongsTo(key: string): DefaultSingleResourceRelationship;
  getHasMany(key: string): CollectionResourceRelationship;
}
