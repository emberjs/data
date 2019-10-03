import { SingleResourceRelationship, CollectionResourceRelationship } from './ember-data-json-api';

/**
  @module @ember-data/store
*/

export interface AttributesHash {
  attributes?: {
    [key: string]: any;
  };
}

export interface JsonApiResource {
  id?: string | null;
  type?: string;
  attributes?: AttributesHash;
  relationships?: {
    [key: string]: SingleResourceRelationship | CollectionResourceRelationship;
  };
  meta?: any;
}

export interface JsonApiValidationError {
  title: string;
  detail: string;
  source: {
    pointer: string;
  };
}

export type JsonApiRelationship = SingleResourceRelationship | CollectionResourceRelationship;
