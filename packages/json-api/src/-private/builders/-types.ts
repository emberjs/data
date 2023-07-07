import { QueryParamsSerializationOptions } from "@ember-data/request-utils";
import type { ResourceIdentifierObject } from "@ember-data/types/q/ember-data-json-api";

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

export type RemotelyAccessibleIdentifier = {
  id: string;
  type: string;
  lid?: string;
};

export type ConstrainedFindOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string | string[];
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
};
