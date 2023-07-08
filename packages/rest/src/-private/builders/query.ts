import { pluralize } from 'ember-inflector';

import {
  buildQueryParams,
  buildURL,
  QueryParamsSource,
  type QueryUrlOptions
} from '@ember-data/request-utils';
import type { ConstrainedRequestOptions, QueryRequestOptions } from './-types';
import { copyForwardUrlOptions, extractCacheOptions } from './-utils';
import { camelize } from '@ember/string';

export function query(type: string, query: QueryParamsSource = {}, options: ConstrainedRequestOptions = {}): QueryRequestOptions {
  const cacheOptions = extractCacheOptions(options);
  const urlOptions: QueryUrlOptions = {
    identifier: { type },
    requestType: 'query',
    resourcePath: pluralize(camelize(type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildURL(urlOptions);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json; charset=utf-8');

  return {
    url: `${url}?${buildQueryParams(query, options.urlParamsSettings)}`,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'query',
  };
}
