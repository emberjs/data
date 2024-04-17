/**
 * @module @ember-data/active-record/request
 */
import { underscore } from '@ember/string';

import { pluralize } from 'ember-inflector';

import { buildBaseURL, buildQueryParams, type FindRecordUrlOptions } from '@ember-data/request-utils';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import type {
  FindRecordOptions,
  FindRecordRequestOptions,
  RemotelyAccessibleIdentifier,
} from '@warp-drive/core-types/request';
import type { SingleResourceDataDocument } from '@warp-drive/core-types/spec/document';

import { copyForwardUrlOptions, extractCacheOptions } from './-utils';

export type FindRecordResultDocument<T> = Omit<SingleResourceDataDocument<T>, 'data'> & { data: T };

/**
 * Builds request options to fetch a single resource by a known id or identifier
 * configured for the url and header expectations of most ActiveRecord APIs.
 *
 * **Basic Usage**
 *
 * ```ts
 * import { findRecord } from '@ember-data/active-record/request';
 *
 * const data = await store.request(findRecord('person', '1'));
 * ```
 *
 * **With Options**
 *
 * ```ts
 * import { findRecord } from '@ember-data/active-record/request';
 *
 * const options = findRecord('person', '1', { include: ['pets', 'friends'] });
 * const data = await store.request(options);
 * ```
 *
 * **With an Identifier**
 *
 * ```ts
 * import { findRecord } from '@ember-data/active-record/request';
 *
 * const options = findRecord({ type: 'person', id: '1' }, { include: ['pets', 'friends'] });
 * const data = await store.request(options);
 * ```
 *
 * **Supplying Options to Modify the Request Behavior**
 *
 * The following options are supported:
 *
 * - `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
 * - `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
 * - `resourcePath` - The resource path to use for the request, defaults to pluralizing and underscoring the supplied type
 * - `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
 *      option will delegate to the store's lifetimes service, defaulting to `false` if none is configured.
 * - `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
 *      promise with the cached value, not supplying this option will delegate to the store's lifetimes service,
 *      defaulting to `false` if none is configured.
 * - `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)
 *
 * ```ts
 * import { findRecord } from '@ember-data/active-record/request';
 *
 * const options = findRecord('person', '1', { include: ['pets', 'friends'] }, { namespace: 'api/v2' });
 * const data = await store.request(options);
 * ```
 *
 * @method findRecord
 * @public
 * @static
 * @for @ember-data/active-record/request
 * @param identifier
 * @param options
 */
export function findRecord<T>(
  identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>,
  options?: FindRecordOptions<T>
): FindRecordRequestOptions<T, FindRecordResultDocument<T>>;
export function findRecord(
  identifier: RemotelyAccessibleIdentifier,
  options?: FindRecordOptions
): FindRecordRequestOptions;
export function findRecord<T>(
  type: TypeFromInstance<T>,
  id: string,
  options?: FindRecordOptions<T>
): FindRecordRequestOptions<T, FindRecordResultDocument<T>>;
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
    resourcePath: pluralize(underscore(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Accept', 'application/json;charset=utf-8');

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
