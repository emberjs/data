import { underscore } from '@ember/string';

import { pluralize } from 'ember-inflector';

import { buildBaseURL, buildQueryParams, QueryParamsSource, type QueryUrlOptions } from '@ember-data/request-utils';

import type { ConstrainedRequestOptions, QueryRequestOptions } from './-types';
import { copyForwardUrlOptions, extractCacheOptions } from './-utils';

export function query(
  type: string,
  query: QueryParamsSource = {},
  options: ConstrainedRequestOptions = {}
): QueryRequestOptions {
  const cacheOptions = extractCacheOptions(options);
  const urlOptions: QueryUrlOptions = {
    identifier: { type },
    op: 'query',
    resourcePath: pluralize(underscore(type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
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
