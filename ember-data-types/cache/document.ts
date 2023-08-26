import type { ImmutableRequestInfo, ResponseInfo as ImmutableResponseInfo } from '@ember-data/request/-private/types';
import { Links, Meta, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import { StableExistingRecordIdentifier } from '@ember-data/types/q/identifier';

import { JsonApiError } from '../q/record-data-json-api';

export type RequestInfo = ImmutableRequestInfo;
export type ResponseInfo = ImmutableResponseInfo;

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
  errors: JsonApiError[];
}

export type ResourceDocument<T = StableExistingRecordIdentifier> =
  | ResourceMetaDocument
  | SingleResourceDataDocument<T>
  | CollectionResourceDataDocument<T>
  | ResourceErrorDocument;

export interface StructuredDataDocument<T> {
  request?: RequestInfo;
  response?: ResponseInfo | Response | null;
  content: T;
}
export interface StructuredErrorDocument<T> extends Error {
  request?: RequestInfo;
  response?: ResponseInfo | Response | null;
  error: string | object;
  content?: T;
}
export type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument<T>;
