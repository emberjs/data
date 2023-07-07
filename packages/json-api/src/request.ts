import { pluralize } from 'ember-inflector';

import {
  buildURL,
  FindRecordUrlOptions,
  QueryParamsSerializationOptions,
  buildQueryParams,
} from '@ember-data/request-utils';
import { ResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';

type CacheOptions = {
  key?: string;
  reload?: boolean;
  backgroundReload?: boolean;
};
type FindRecordRequestOptions = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions: CacheOptions;
  op: 'findRecord';
  records: [ResourceIdentifierObject];
};

type ConstrainedFindOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: string | string[];
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
};
type RemotelyAccessibleIdentifier = {
  id: string;
  type: string;
  lid?: string;
};

export function findRecord(
  identifier: RemotelyAccessibleIdentifier,
  options?: ConstrainedFindOptions
): FindRecordRequestOptions;
export function findRecord(type: string, id: string, options?: ConstrainedFindOptions): FindRecordRequestOptions;
export function findRecord(
  arg1: string | RemotelyAccessibleIdentifier,
  arg2: string | ConstrainedFindOptions | undefined,
  arg3?: ConstrainedFindOptions
): FindRecordRequestOptions {
  const identifier: RemotelyAccessibleIdentifier = typeof arg1 === 'string' ? { type: arg1, id: arg2 as string } : arg1;
  const options = ((typeof arg1 === 'string' ? arg3 : arg2) || {}) as ConstrainedFindOptions;

  const cacheOptions: CacheOptions = {};
  if (options.reload) {
    cacheOptions.reload = options.reload;
  }
  if (options.backgroundReload) {
    cacheOptions.backgroundReload = options.backgroundReload;
  }

  const urlOptions: FindRecordUrlOptions = {
    identifier,
    requestType: 'findRecord',
    resourcePath: pluralize(identifier.type),
  };

  if ('host' in options) {
    urlOptions.host = options.host;
  }
  if ('namespace' in options) {
    urlOptions.namespace = options.namespace;
  }
  if ('resourcePath' in options) {
    urlOptions.resourcePath = options.resourcePath;
  }

  const url = buildURL(urlOptions);
  const headers = new Headers();
  headers.append('Accept', 'application/vnd.api+json');
  headers.append('Content-Type', 'application/vnd.api+json');

  return {
    url: options.include?.length ? addInclude(url, options.include, options) : url,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'findRecord',
    records: [identifier],
  };
}

function addInclude(url: string, include: string | string[], options: ConstrainedFindOptions): string {
  include = typeof include === 'string' ? include.split(',') : include;
  const query = buildQueryParams({ include }, options.urlParamsSettings);

  return `${url}?${query}`;
}
