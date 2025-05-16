import type { StableExistingRecordIdentifier } from '../identifier.ts';
import type { ApiError } from './error.ts';
import type { Links, Meta, PaginationLinks } from './json-api-raw.ts';

export interface ResourceMetaDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  meta: Meta;
  links?: Links | PaginationLinks;
}

export interface SingleResourceDataDocument<T = StableExistingRecordIdentifier, R = StableExistingRecordIdentifier> {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: T | null;
  included?: R[];
}

export interface CollectionResourceDataDocument<T = StableExistingRecordIdentifier> {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: T[];
  included?: T[];
}

export type ResourceDataDocument<T = StableExistingRecordIdentifier> =
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>;

export interface ResourceErrorDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  errors: ApiError[];
}

export type ResourceDocument<T = StableExistingRecordIdentifier> =
  | ResourceMetaDocument
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>
  | ResourceErrorDocument;
