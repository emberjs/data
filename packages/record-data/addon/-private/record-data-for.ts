import { recordDataFor } from '@ember-data/store/-private';
import Relationships from './relationships/state/create';
import Relationship from './relationships/state/relationship';
import BelongsToRelationship from './relationships/state/belongs-to';
import ManyRelationship from './relationships/state/has-many';
import { ConfidentDict } from '@ember-data/store/-private/ts-interfaces/utils';
import { RelationshipRecordData } from './ts-interfaces/relationship-record-data';

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
