import type { RecordDataStoreWrapper } from '@ember-data/store/-private';
import type {
  CollectionResourceRelationship,
  SingleResourceRelationship,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import type { RecordData } from '@ember-data/store/-private/ts-interfaces/record-data';

import type BelongsToRelationship from '../relationships/state/belongs-to';

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
  clientId: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): RecordIdentifier;
  getBelongsTo(key: string): DefaultSingleResourceRelationship;
  getHasMany(key: string): CollectionResourceRelationship;
}
