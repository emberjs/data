import type { ImmutableRequestInfo, ResponseInfo as ImmutableResponseInfo } from '@ember-data/request/-private/types';
import { Links, Meta, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import { StableExistingRecordIdentifier } from '@ember-data/types/q/identifier';

export type RequestInfo = ImmutableRequestInfo;
export type ResponseInfo = ImmutableResponseInfo;

export interface ResourceMetaDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  meta: Meta;
  links?: Links | PaginationLinks;
}

export interface SingleResourceDataDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: StableExistingRecordIdentifier | null;
}

export interface CollectionResourceDataDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: StableExistingRecordIdentifier[];
}

export type ResourceDataDocument = SingleResourceDataDocument | CollectionResourceDataDocument;

export interface ResourceErrorDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  error: string | object;
}

export type ResourceDocument =
  | ResourceMetaDocument
  | SingleResourceDataDocument
  | CollectionResourceDataDocument
  | ResourceErrorDocument;

export interface StructuredDataDocument<T> {
  request?: RequestInfo;
  response?: ResponseInfo | Response | null;
  content: T;
}
export interface StructuredErrorDocument extends Error {
  request?: RequestInfo;
  response?: ResponseInfo | Response | null;
  error: string | object;
  content?: unknown;
}
export type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument;
