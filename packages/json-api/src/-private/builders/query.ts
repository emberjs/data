/**
 * @module @ember-data/json-api/request
 */
import { pluralize } from 'ember-inflector';

import { buildBaseURL, buildQueryParams, QueryParamsSource, type QueryUrlOptions } from '@ember-data/request-utils';
import type { ConstrainedRequestOptions, QueryRequestOptions } from '@ember-data/types/request';

import { copyForwardUrlOptions, extractCacheOptions } from './-utils';

/**
 * Builds request options to query for resources, usually by a primary
 * type, configured for the url and header expectations of most JSON:API APIs.
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

  return {
    url: `${url}?${buildQueryParams(query, options.urlParamsSettings)}`,
    method: 'GET',
    headers,
    cacheOptions,
    op: 'query',
  };
}
