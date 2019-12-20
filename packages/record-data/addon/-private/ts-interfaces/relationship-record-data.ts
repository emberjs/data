type CollectionResourceRelationship = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').CollectionResourceRelationship;
type SingleResourceRelationship = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').SingleResourceRelationship;
type RecordData = import('@ember-data/store/-private/ts-interfaces/record-data').RecordData;
type HasManyRelationship = import('../relationships/state/has-many').default;
type Relationships = import('../relationships/state/create').default;
type BelongsToRelationship = import('../relationships/state/belongs-to').default;
type RecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').RecordIdentifier;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type RecordDataStoreWrapper = import('@ember-data/store/-private/ts-interfaces/record-data-store-wrapper').RecordDataStoreWrapper;

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
  identifier: StableRecordIdentifier;
  getResourceIdentifier(): RecordIdentifier;
  _relationships: Relationships;
  getBelongsTo(key: string): DefaultSingleResourceRelationship;
  getHasMany(key: string): DefaultCollectionResourceRelationship;
}
