import { QueryParamsSerializationOptions } from '@ember-data/request-utils';
import type { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';

export type CacheOptions = {
  key?: string;
  reload?: boolean;
  backgroundReload?: boolean;
};
export type FindRecordRequestOptions = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions: CacheOptions;
  op: 'findRecord';
  records: [ResourceIdentifierObject];
};

export type QueryRequestOptions = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions: CacheOptions;
  op: 'query';
};

export type RemotelyAccessibleIdentifier = {
  id: string;
  type: string;
  lid?: string;
};

export type ConstrainedRequestOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
};
