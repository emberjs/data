import { pluralize } from 'ember-inflector';

import {
  buildURL,
  type FindRecordUrlOptions
} from '@ember-data/request-utils';
import type { ConstrainedFindOptions, FindRecordRequestOptions, RemotelyAccessibleIdentifier } from './-types';
import { addInclude, copyForwardUrlOptions, extractCacheOptions } from './-utils';


export function findRecord(identifier: RemotelyAccessibleIdentifier, options?: ConstrainedFindOptions): FindRecordRequestOptions;
export function findRecord(type: string, id: string, options?: ConstrainedFindOptions): FindRecordRequestOptions;
export function findRecord(
  arg1: string | RemotelyAccessibleIdentifier,
  arg2: string | ConstrainedFindOptions | undefined,
  arg3?: ConstrainedFindOptions
): FindRecordRequestOptions {
  const identifier: RemotelyAccessibleIdentifier = typeof arg1 === 'string' ? { type: arg1, id: arg2 as string } : arg1;
  const options = ((typeof arg1 === 'string' ? arg3 : arg2) || {}) as ConstrainedFindOptions;
  const cacheOptions = extractCacheOptions(options);
  const urlOptions: FindRecordUrlOptions = {
    identifier,
    requestType: 'findRecord',
    resourcePath: pluralize(identifier.type),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildURL(urlOptions);
  const headers = new Headers();
  headers.append('Accept', 'application/vnd.api+json');
  headers.append('Content-Type', 'application/vnd.api+json');

  return {
    url: options.include?.length ? addInclude(url, options) : url,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'findRecord',
    records: [identifier],
  };
}
