import { recordDataFor } from '@ember-data/store/-private';

type RelationshipRecordData = import('./ts-interfaces/relationship-record-data').RelationshipRecordData;
type ConfidentDict<T> = import('@ember-data/store/-private/ts-interfaces/utils').ConfidentDict<T>;
type ManyRelationship = import('./relationships/state/has-many').default;
type BelongsToRelationship = import('./relationships/state/belongs-to').default;
type Relationship = import('./relationships/state/relationship').default;
type Relationships = import('./relationships/state/create').default;

export function relationshipsFor(instance: any): Relationships {
  let recordData = (recordDataFor(instance) || instance) as RelationshipRecordData;

  return recordData._relationships;
}

export function relationshipStateFor(instance: any, propertyName: string): BelongsToRelationship | ManyRelationship {
  return relationshipsFor(instance).get(propertyName);
}

export function implicitRelationshipsFor(instance: any): ConfidentDict<Relationship> {
  let recordData = (recordDataFor(instance) || instance) as RelationshipRecordData;

  return recordData._implicitRelationships;
}

export function implicitRelationshipStateFor(instance: any, propertyName: string): Relationship {
  return implicitRelationshipsFor(instance)[propertyName];
}
