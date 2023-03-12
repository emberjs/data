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

export interface ResourceDataDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  data: StableExistingRecordIdentifier | StableExistingRecordIdentifier[] | null;
}

export interface ResourceErrorDocument {
  // the url or cache-key associated with the structured document
  lid?: string;
  links?: Links | PaginationLinks;
  meta?: Meta;
  error: string | object;
}

export type ResourceDocument = ResourceMetaDocument | ResourceDataDocument | ResourceErrorDocument;

export interface StructuredDataDocument<T> {
  request?: RequestInfo;
  response?: ResponseInfo;
  data: T;
}
export interface StructuredErrorDocument extends Error {
  request?: RequestInfo;
  response?: ResponseInfo;
  error: string | object;
}
export type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument;
