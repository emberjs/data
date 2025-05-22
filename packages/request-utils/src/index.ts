/**
 * Simple utility function to assist in url building,
 * query params, and other common request operations.
 *
 * These primitives may be used directly or composed
 * by request builders to provide a consistent interface
 * for building requests.
 *
 * For instance:
 *
 * ```ts
 * import { buildBaseURL, buildQueryParams } from '@ember-data/request-utils';
 *
 * const baseURL = buildBaseURL({
 *   host: 'https://api.example.com',
 *   namespace: 'api/v1',
 *   resourcePath: 'emberDevelopers',
 *   op: 'query',
 *   identifier: { type: 'ember-developer' }
 * });
 * const url = `${baseURL}?${buildQueryParams({ name: 'Chris', include:['pets'] })}`;
 * // => 'https://api.example.com/api/v1/emberDevelopers?include=pets&name=Chris'
 * ```
 *
 * This is useful, but not as useful as the REST request builder for query which is sugar
 * over this (and more!):
 *
 * ```ts
 * import { query } from '@ember-data/rest/request';
 *
 * const options = query('ember-developer', { name: 'Chris', include:['pets'] });
 * // => { url: 'https://api.example.com/api/v1/emberDevelopers?include=pets&name=Chris' }
 * // Note: options will also include other request options like headers, method, etc.
 * ```
 *
 * @module
 * @public
 */

import { deprecate } from '@ember/debug';

import {
  type CacheControlValue,
  DefaultCachePolicy,
  parseCacheControl,
  type PolicyConfig,
} from '@warp-drive/core/store';

export * from '@warp-drive/utilities';
export type * from '@warp-drive/utilities';

export { DefaultCachePolicy as CachePolicy, type PolicyConfig, type CacheControlValue, parseCacheControl };

export class LifetimesService extends DefaultCachePolicy {
  constructor(config: PolicyConfig) {
    deprecate(
      `\`import { LifetimesService } from '@ember-data/request-utils';\` is deprecated, please use \`import { CachePolicy } from '@ember-data/request-utils';\` instead.`,
      false,
      {
        id: 'ember-data:deprecate-lifetimes-service-import',
        since: {
          enabled: '5.4',
          available: '4.13',
        },
        for: 'ember-data',
        until: '6.0',
      }
    );
    super(config);
  }
}
