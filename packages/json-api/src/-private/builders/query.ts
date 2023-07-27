import { pluralize } from 'ember-inflector';

import { buildBaseURL, buildQueryParams, QueryParamsSource, type QueryUrlOptions } from '@ember-data/request-utils';
import type { ConstrainedRequestOptions, QueryRequestOptions } from '@ember-data/types/request';

import { copyForwardUrlOptions, extractCacheOptions } from './-utils';

export function query(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  query: QueryParamsSource = {},
  options: ConstrainedRequestOptions = {}
): QueryRequestOptions {
  const cacheOptions = extractCacheOptions(options);
  const urlOptions: QueryUrlOptions = {
    identifier: { type },
    op: 'query',
    resourcePath: pluralize(type),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Accept', 'application/vnd.api+json');
  headers.append('Content-Type', 'application/vnd.api+json');

  return {
    url: `${url}?${buildQueryParams(query, options.urlParamsSettings)}`,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'query',
  };
}
