import { QueryParamsSerializationOptions } from '@ember-data/request-utils';
import type { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';

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

export type DeleteRequestOptions = {
  url: string;
  method: 'DELETE';
  headers: Headers;
  op: 'deleteRecord';
  data: {
    record: StableRecordIdentifier;
  };
};

export type UpdateRequestOptions = {
  url: string;
  method: 'PATCH' | 'PUT';
  headers: Headers;
  op: 'updateRecord';
  data: {
    record: StableRecordIdentifier;
  };
};

export type CreateRequestOptions = {
  url: string;
  method: 'POST';
  headers: Headers;
  op: 'createRecord';
  data: {
    record: StableRecordIdentifier;
  };
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

export type FindRecordOptions = ConstrainedRequestOptions & {
  include?: string | string[];
};
