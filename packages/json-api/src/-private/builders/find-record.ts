import { pluralize } from 'ember-inflector';

import { buildBaseURL, buildQueryParams, type FindRecordUrlOptions } from '@ember-data/request-utils';
import type {
  FindRecordOptions,
  FindRecordRequestOptions,
  RemotelyAccessibleIdentifier,
} from '@ember-data/types/request';

import { copyForwardUrlOptions, extractCacheOptions } from './-utils';

export function findRecord(
  identifier: RemotelyAccessibleIdentifier,
  options?: FindRecordOptions
): FindRecordRequestOptions;
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
    op: 'findRecord',
    resourcePath: pluralize(identifier.type),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Accept', 'application/vnd.api+json');
  headers.append('Content-Type', 'application/vnd.api+json');

  return {
    url: options.include?.length
      ? `${url}?${buildQueryParams({ include: options.include }, options.urlParamsSettings)}`
      : url,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'findRecord',
    records: [identifier],
  };
}
