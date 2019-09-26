import { recordDataFor } from '@ember-data/store/-private';

export function relationshipsFor(instance: any) {
  let recordData = recordDataFor(instance) || instance;

  return recordData._relationships;
}

export function relationshipStateFor(instance: any, propertyName: string) {
  return relationshipsFor(instance).get(propertyName);
}

export function implicitRelationshipsFor(instance: any) {
  let recordData = recordDataFor(instance) || instance;

  return recordData.__implicitRelationships;
}

export function implicitRelationshipStateFor(instance: any, propertyName: string) {
  return implicitRelationshipsFor(instance)[propertyName];
}
