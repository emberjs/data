import Relationships from '../relationships/state/create';
import Relationship from '../relationships/state/relationship';
import RecordData from '@ember-data/store/-private/ts-interfaces/record-data';
import {
  SingleResourceRelationship,
  CollectionResourceRelationship,
} from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import { RecordIdentifier } from '@ember-data/store/-private/ts-interfaces/identifier';
import { RecordDataStoreWrapper } from '@ember-data/store/-private/ts-interfaces/record-data-store-wrapper';
import BelongsToRelationship from '../relationships/state/belongs-to';
import HasManyRelationship from '../relationships/state/has-many';
import { ConfidentDict } from '@ember-data/store/-private/ts-interfaces/utils';

export interface DefaultSingleResourceRelationship extends SingleResourceRelationship {
  _relationship: BelongsToRelationship;
}
export interface DefaultCollectionResourceRelationship extends CollectionResourceRelationship {
  _relationship: HasManyRelationship;
}

export interface RelationshipRecordData extends RecordData {
  //Required by the relationship layer
  isNew(): boolean;
  modelName: string;
  storeWrapper: RecordDataStoreWrapper;
  id: string | null;
  clientId: string | null;
  isEmpty(): boolean;
  getResourceIdentifier(): RecordIdentifier;
  _relationships: Relationships;
  _implicitRelationships: ConfidentDict<Relationship>;
  __implicitRelationships: ConfidentDict<Relationship> | null;
  getBelongsTo(key: string): DefaultSingleResourceRelationship;
  getHasMany(key: string): DefaultCollectionResourceRelationship;
}
