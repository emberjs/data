import type { PersistedResourceKey } from '../identifier.ts';
import type { ApiError } from './error.ts';
import type { Links, Meta, PaginationLinks } from './json-api-raw.ts';

export interface ResourceMetaDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  meta: Meta;
  links?: Links | PaginationLinks;
}

export interface SingleResourceDataDocument<T = PersistedResourceKey, R = PersistedResourceKey> {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: T | null;
  included?: R[];
}

export interface CollectionResourceDataDocument<T = PersistedResourceKey> {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: T[];
  included?: T[];
}

export type ResourceDataDocument<T = PersistedResourceKey> =
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>;

export interface ResourceErrorDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  errors: ApiError[];
}

export type ResourceDocument<T = PersistedResourceKey> =
  | ResourceMetaDocument
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>
  | ResourceErrorDocument;
