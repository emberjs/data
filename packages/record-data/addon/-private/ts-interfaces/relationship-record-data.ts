type SingleResourceRelationship = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').SingleResourceRelationship;
type CollectionResourceRelationship = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').CollectionResourceRelationship;
type RecordData = import('@ember-data/store/-private/ts-interfaces/record-data').RecordData;
type ConfidentDict<T> = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<T>;
type HasManyRelationship = import('../relationships/state/has-many').default;
type BelongsToRelationship = import('../relationships/state/belongs-to').default;
type RecordDataStoreWrapper = import('@ember-data/store/-private/ts-interfaces/record-data-store-wrapper').RecordDataStoreWrapper;
type RecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').RecordIdentifier;
type Relationship = import('../relationships/state/relationship').default;
type Relationships = import('../relationships/state/create').default;

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
