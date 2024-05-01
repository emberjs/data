/**
 * @module @ember-data/json-api/request
 */
import { pluralize } from 'ember-inflector';

import { buildBaseURL, buildQueryParams, type QueryUrlOptions } from '@ember-data/request-utils';
import type { QueryParamsSource } from '@warp-drive/core-types/params';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core-types/record';
import type {
  CacheOptions,
  ConstrainedRequestOptions,
  PostQueryRequestOptions,
  QueryRequestOptions,
} from '@warp-drive/core-types/request';
import type { CollectionResourceDataDocument } from '@warp-drive/core-types/spec/document';

import { ACCEPT_HEADER_VALUE, copyForwardUrlOptions, extractCacheOptions } from './-utils';

/**
 * Builds request options to query for resources, usually by a primary
 * type, configured for the url and header expectations of most JSON:API APIs.
 *
 * The key difference between this and `postQuery` is that this method will send the query
 * as query params in the url of a "GET" request instead of as the JSON body of a "POST"
 * request.
 *
 * **Basic Usage**
 *
 * ```ts
 * import { query } from '@ember-data/json-api/request';
 *
 * const data = await store.request(query('person'));
 * ```
 *
 * **With Query Params**
 *
 * ```ts
 * import { query } from '@ember-data/json-api/request';
 *
 * const options = query('person', { include: ['pets', 'friends'] });
 * const data = await store.request(options);
 * ```
 *
 * **Supplying Options to Modify the Request Behavior**
 *
 * The following options are supported:
 *
 * - `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
 * - `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
 * - `resourcePath` - The resource path to use for the request, defaults to pluralizing the supplied type
 * - `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
 *      option will delegate to the store's lifetimes service, defaulting to `false` if none is configured.
 * - `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
 *      promise with the cached value, not supplying this option will delegate to the store's lifetimes service,
 *      defaulting to `false` if none is configured.
 * - `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)
 *
 * ```ts
 * import { query } from '@ember-data/json-api/request';
 *
 * const options = query('person', { include: ['pets', 'friends'] }, { reload: true });
 * const data = await store.request(options);
 * ```
 *
 * @method query
 * @public
 * @static
 * @for @ember-data/json-api/request
 * @param identifier
 * @param query
 * @param options
 */
export function query<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  query?: QueryParamsSource<T>,
  options?: ConstrainedRequestOptions
): QueryRequestOptions<T, CollectionResourceDataDocument<T>>;
export function query(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  query?: QueryParamsSource,
  options?: ConstrainedRequestOptions
): QueryRequestOptions;
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
  headers.append('Accept', ACCEPT_HEADER_VALUE);
  const queryString = buildQueryParams(query, options.urlParamsSettings);

  return {
    url: queryString ? `${url}?${queryString}` : url,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'query',
  };
}

/**
 * Builds request options to query for resources, usually by a primary
 * type, configured for the url and header expectations of most JSON:API APIs.
 *
 * The key difference between this and `query` is that this method will send the query
 * as the JSON body of a "POST" request instead of as query params in the url of a "GET"
 * request.
 *
 * A CacheKey is generated from the url and query params, and used to cache the response
 * in the store.
 *
 * ```ts
 * import { postQuery } from '@ember-data/json-api/request';
 *
 * const options = postQuery('person', { include: ['pets', 'friends'] });
 * const data = await store.request(options);
 * ```
 *
 * **Supplying Options to Modify the Request Behavior**
 *
 * The following options are supported:
 *
 * - `host` - The host to use for the request, defaults to the `host` configured with `setBuildURLConfig`.
 * - `namespace` - The namespace to use for the request, defaults to the `namespace` configured with `setBuildURLConfig`.
 * - `resourcePath` - The resource path to use for the request, defaults to pluralizing the supplied type
 * - `reload` - Whether to forcibly reload the request if it is already in the store, not supplying this
 *      option will delegate to the store's lifetimes service, defaulting to `false` if none is configured.
 * - `backgroundReload` - Whether to reload the request if it is already in the store, but to also resolve the
 *      promise with the cached value, not supplying this option will delegate to the store's lifetimes service,
 *      defaulting to `false` if none is configured.
 * - `urlParamsSetting` - an object containing options for how to serialize the query params (see `buildQueryParams`)
 *
 * ```ts
 * import { postQuery } from '@ember-data/json-api/request';
 *
 * const options = postQuery('person', { include: ['pets', 'friends'] }, { reload: true });
 * const data = await store.request(options);
 * ```
 *
 * @method postQuery
 * @public
 * @static
 * @for @ember-data/json-api/request
 * @param identifier
 * @param query
 * @param options
 */
export function postQuery<T>(
  type: TypeFromInstance<T>,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  query?: QueryParamsSource,
  options?: ConstrainedRequestOptions
): PostQueryRequestOptions<T, CollectionResourceDataDocument<T>>;
export function postQuery(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  query?: QueryParamsSource,
  options?: ConstrainedRequestOptions
): PostQueryRequestOptions;
export function postQuery(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  query: QueryParamsSource = {},
  options: ConstrainedRequestOptions = {}
): PostQueryRequestOptions {
  const cacheOptions = extractCacheOptions(options);
  const urlOptions: QueryUrlOptions = {
    identifier: { type },
    op: 'query',
    resourcePath: options.resourcePath ?? pluralize(type),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();
  headers.append('Accept', ACCEPT_HEADER_VALUE);

  const queryData = structuredClone(query);
  cacheOptions.key = cacheOptions.key ?? `${url}?${buildQueryParams(queryData, options.urlParamsSettings)}`;

  return {
    url,
    method: 'POST',
    body: JSON.stringify(query),
    headers,
    cacheOptions: cacheOptions as CacheOptions & { key: string },
    op: 'query',
  };
}
