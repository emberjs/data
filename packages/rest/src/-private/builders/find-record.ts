import { pluralize } from 'ember-inflector';

import {
  buildQueryParams,
  buildURL,
  type FindRecordUrlOptions
} from '@ember-data/request-utils';
import type { ConstrainedRequestOptions, FindRecordRequestOptions, RemotelyAccessibleIdentifier } from './-types';
import { copyForwardUrlOptions, extractCacheOptions } from './-utils';
import { camelize } from '@ember/string';

type FindRecordOptions = ConstrainedRequestOptions & {
  include?: string | string[];
}

export function findRecord(identifier: RemotelyAccessibleIdentifier, options?: FindRecordOptions): FindRecordRequestOptions;
export function findRecord(type: string, id: string, options?: FindRecordOptions): FindRecordRequestOptions;
export function findRecord(
  arg1: string | RemotelyAccessibleIdentifier,
  arg2: string | FindRecordOptions | undefined,
  arg3?: FindRecordOptions
): FindRecordRequestOptions {
  const identifier: RemotelyAccessibleIdentifier = typeof arg1 === 'string' ? { type: arg1, id: arg2 as string } : arg1;
  const options = ((typeof arg1 === 'string' ? arg3 : arg2) || {}) as FindRecordOptions;
  const cacheOptions = extractCacheOptions(options);
  const urlOptions: FindRecordUrlOptions = {
    identifier,
    requestType: 'findRecord',
    resourcePath: pluralize(camelize(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildURL(urlOptions);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json; charset=utf-8');

  return {
    url: options.include?.length ? `${url}?${buildQueryParams({ include: options.include }, options.urlParamsSettings)}` : url,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'findRecord',
    records: [identifier],
  };
}
