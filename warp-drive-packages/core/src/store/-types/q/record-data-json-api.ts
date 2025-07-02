import type { Value } from '../../../types/json/raw.ts';
import type {
  CollectionResourceRelationship,
  Links,
  Meta,
  SingleResourceRelationship,
} from '../../../types/spec/json-api-raw.ts';

export type AttributesHash = Record<string, Value>;

export interface JsonApiResource {
  id?: string | null;
  type?: string;
  lid?: string;
  attributes?: AttributesHash;
  relationships?: Record<string, SingleResourceRelationship | CollectionResourceRelationship>;
  meta?: Meta;
  links?: Links;
}

export type JsonApiRelationship = SingleResourceRelationship | CollectionResourceRelationship;
