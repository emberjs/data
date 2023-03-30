import type {
  CollectionResourceRelationship,
  Link,
  Links,
  Meta,
  SingleResourceRelationship,
} from './ember-data-json-api';
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

export interface JsonApiError {
  id?: string;
  title?: string;
  detail?: string;
  links?: {
    about?: Link;
    type?: Link;
  };
  status?: string;
  code?: string;
  source?: {
    pointer: string;
    parameter?: string;
    header?: string;
  };
  meta?: Meta;
}

export type JsonApiRelationship = SingleResourceRelationship | CollectionResourceRelationship;
