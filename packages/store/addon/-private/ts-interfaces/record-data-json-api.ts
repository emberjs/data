import type { CollectionResourceRelationship, SingleResourceRelationship } from './ember-data-json-api';
import type { Dict } from './utils';

/**
  @module @ember-data/store
*/

export type AttributesHash = Dict<unknown>;

export interface JsonApiResource {
  id?: string | null;
  type?: string;
  attributes?: AttributesHash;
  relationships?: {
    [key: string]: SingleResourceRelationship | CollectionResourceRelationship;
  };
  meta?: any;
  lid?: string;
}

export interface JsonApiValidationError {
  title: string;
  detail: string;
  source: {
    pointer: string;
  };
}

export type JsonApiRelationship = SingleResourceRelationship | CollectionResourceRelationship;
