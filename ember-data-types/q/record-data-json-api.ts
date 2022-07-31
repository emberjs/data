import type { CollectionResourceRelationship, Links, Meta, SingleResourceRelationship } from './ember-data-json-api';
import type { Dict } from './utils';

/**
  @module @ember-data/store
*/

export type AttributesHash = Dict<unknown>;

export interface JsonApiResource {
  id?: string | null;
  type?: string;
  lid?: string;
  attributes?: AttributesHash;
  relationships?: Dict<SingleResourceRelationship | CollectionResourceRelationship>;
  meta?: Meta;
  links?: Links;
}

export interface JsonApiValidationError {
  title: string;
  detail: string;
  source: {
    pointer: string;
  };
}

export type JsonApiRelationship = SingleResourceRelationship | CollectionResourceRelationship;
