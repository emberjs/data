type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type SingleResourceRelationship =
  import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').SingleResourceRelationship;
type CollectionResourceRelationship =
  import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').CollectionResourceRelationship;
type RecordData = import('@ember-data/store/-private/ts-interfaces/record-data').RecordData;
type BelongsToRelationship = import('../relationships/state/belongs-to').default;
type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type RecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').RecordIdentifier;

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
