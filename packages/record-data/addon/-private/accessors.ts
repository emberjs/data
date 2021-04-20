import { graphFor } from './graph/index';

type RecordDataStoreWrapper = import('@ember-data/store/-private').RecordDataStoreWrapper;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type InternalModel = import('@ember-data/store/-private').InternalModel;
type RelationshipRecordData = import('./ts-interfaces/relationship-record-data').RelationshipRecordData;
type RelationshipDict = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<Relationship>;
type ManyRelationship = import('./relationships/state/has-many').default;
type BelongsToRelationship = import('./relationships/state/belongs-to').default;
type Relationship = import('./relationships/state/relationship').default;
type Relationships = import('./relationships/state/create').default;

type MappableToRelationships = { _internalModel: InternalModel };

export function relationshipsFor(instance: RecordDataStoreWrapper, identifier: StableRecordIdentifier): Relationships;
export function relationshipsFor(instance: MappableToRelationships): Relationships;
export function relationshipsFor(
  instance: MappableToRelationships | RecordDataStoreWrapper,
  identifier?: StableRecordIdentifier
): Relationships {
  if (!identifier) {
    let internalModel = ((instance as unknown) as MappableToRelationships)._internalModel;
    identifier = internalModel.identifier;

    // safe to upgrade as relationshipsFor is a private util used only for our own things
    instance = (internalModel._recordData as RelationshipRecordData).storeWrapper;
  }

  return graphFor(instance as RecordDataStoreWrapper).get(identifier);
}

export function relationshipStateFor(
  instance: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier,
  propertyName: string
): BelongsToRelationship | ManyRelationship;
export function relationshipStateFor(
  instance: MappableToRelationships,
  identifier: string
): BelongsToRelationship | ManyRelationship;
export function relationshipStateFor(
  instance: RecordDataStoreWrapper | MappableToRelationships,
  identifier: string | StableRecordIdentifier,
  propertyName?: string
): BelongsToRelationship | ManyRelationship {
  if (!propertyName) {
    let internalModel = ((instance as unknown) as MappableToRelationships)._internalModel;
    propertyName = (identifier as unknown) as string;
    identifier = internalModel.identifier;
    instance = (internalModel._recordData as RelationshipRecordData).storeWrapper;
  }
  return relationshipsFor(instance as RecordDataStoreWrapper, identifier as StableRecordIdentifier).get(propertyName);
}

export function implicitRelationshipsFor(
  storeWrapper: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier
): RelationshipDict {
  return graphFor(storeWrapper).getImplicit(identifier);
}

export function implicitRelationshipStateFor(
  storeWrapper: RecordDataStoreWrapper,
  identifier: StableRecordIdentifier,
  propertyName: string
): Relationship {
  return implicitRelationshipsFor(storeWrapper, identifier)[propertyName];
}
