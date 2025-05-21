import type { Value } from '../../../types/json/raw.ts';
import type {
  CollectionResourceRelationship,
  Link,
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
