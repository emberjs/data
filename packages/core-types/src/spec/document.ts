import type { StableExistingRecordIdentifier } from '../identifier';
import type { ApiError } from './error';
import type { Links, Meta, PaginationLinks } from './raw';

export interface ResourceMetaDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  meta: Meta;
  links?: Links | PaginationLinks;
}

export interface SingleResourceDataDocument<T = StableExistingRecordIdentifier> {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: T | null;
  included?: T[];
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
