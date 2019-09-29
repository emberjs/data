import { Record } from './record';
import RSVP from 'rsvp';
import EmberObject from '@ember/object';
import { JsonApiValidationError } from './record-data-json-api';
import { RelationshipSchema } from './record-data-schemas';

// Placeholder until model.js is typed
export interface DSModel extends Record, EmberObject {
  toString(): string;
  save(): RSVP.Promise<DSModel>;
  eachRelationship(callback: (key: string, meta: RelationshipSchema) => void): void;
  eachAttribute(callback: (key: string) => void): void;
  invalidErrorsChanged(errors: JsonApiValidationError[]): void;
  [key: string]: unknown;
}
