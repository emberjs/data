/**
 * @module @ember-data/json-api/request
 */
import type { BuildURLConfig, UrlOptions } from '@ember-data/request-utils';
import { buildQueryParams as buildParams, setBuildURLConfig as setConfig } from '@ember-data/request-utils';
import type { QueryParamsSource } from '@warp-drive/core-types/params';
import type { CacheOptions, ConstrainedRequestOptions } from '@warp-drive/core-types/request';

export interface JSONAPIConfig extends BuildURLConfig {
  profiles?: {
    pagination?: string;
    [key: string]: string | undefined;
  };
  extensions?: {
    atomic?: string;
    [key: string]: string | undefined;
  };
}

const JsonApiAccept = 'application/vnd.api+json';
const DEFAULT_CONFIG: JSONAPIConfig = { host: '', namespace: '' };
export let CONFIG: JSONAPIConfig = DEFAULT_CONFIG;
export let ACCEPT_HEADER_VALUE = 'application/vnd.api+json';

/**
 * Allows setting extensions and profiles to be used in the `Accept` header.
 *
 * Extensions and profiles are keyed by their namespace with the value being
 * their URI.
 *
 * Example:
 *
 * ```ts
 * setBuildURLConfig({
 *   extensions: {
 *     atomic: 'https://jsonapi.org/ext/atomic'
 *   },
 *   profiles: {
 *     pagination: 'https://jsonapi.org/profiles/ethanresnick/cursor-pagination'
 *   }
 * });
 * ```
 *
 * This also sets the global configuration for `buildBaseURL`
 * for host and namespace values for the application
 * in the `@ember-data/request-utils` package.
 *
 * These values may still be overridden by passing
 * them to buildBaseURL directly.
 *
 * This method may be called as many times as needed
 *
 * ```ts
 * type BuildURLConfig = {
 *   host: string;
 *   namespace: string'
 * }
 * ```
 *
 * @method setBuildURLConfig
 * @static
 * @public
 * @for @ember-data/json-api/request
 * @param {BuildURLConfig} config
 * @return void
 */
export function setBuildURLConfig(config: JSONAPIConfig): void {
  CONFIG = Object.assign({}, DEFAULT_CONFIG, config);

  if (config.profiles || config.extensions) {
    let accept = JsonApiAccept;
    if (config.profiles) {
      const profiles = Object.values(config.profiles);
      if (profiles.length) {
        accept += ';profile="' + profiles.join(' ') + '"';
      }
    }
    if (config.extensions) {
      const extensions = Object.values(config.extensions);
      if (extensions.length) {
        accept += ';ext=' + extensions.join(' ');
      }
    }
    ACCEPT_HEADER_VALUE = accept;
  }

  setConfig(config);
}

export function copyForwardUrlOptions(urlOptions: UrlOptions, options: ConstrainedRequestOptions): void {
  if ('host' in options) {
    urlOptions.host = options.host;
  }
  if ('namespace' in options) {
    urlOptions.namespace = options.namespace;
  }
  if ('resourcePath' in options) {
    urlOptions.resourcePath = options.resourcePath;
  }
}

export function extractCacheOptions(options: ConstrainedRequestOptions) {
  const cacheOptions: CacheOptions = {};
  if ('reload' in options) {
    cacheOptions.reload = options.reload;
  }
  if ('backgroundReload' in options) {
    cacheOptions.backgroundReload = options.backgroundReload;
  }
  return cacheOptions;
}

interface RelatedObject {
  [key: string]: string | string[] | RelatedObject;
}

export type JsonApiQuery = {
  include?: string | string[] | RelatedObject;
  fields?: Record<string, string | string[]>;
  page?: {
    size?: number;
    after?: string;
    before?: string;
  };
};

function isJsonApiQuery(query: JsonApiQuery | QueryParamsSource): query is JsonApiQuery {
  if ('include' in query && query.include && typeof query.include === 'object') {
    return true;
  }
  if ('fields' in query || 'page' in query) {
    return true;
  }
  return false;
}

function collapseIncludePaths(basePath: string, include: RelatedObject, paths: string[]) {
  const keys = Object.keys(include);
  for (let i = 0; i < keys.length; i++) {
    // the key is always included too
    paths.push(`${basePath}.${keys[i]}`);
    const key = keys[i];
    const value = include[key];

    // include: { 'company': 'field1,field2' }
    if (typeof value === 'string') {
      value.split(',').forEach((field) => {
        paths.push(`${basePath}.${key}.${field}`);
      });

      // include: { 'company': ['field1', 'field2'] }
    } else if (Array.isArray(value)) {
      value.forEach((field) => {
        paths.push(`${basePath}.${key}.${field}`);
      });

      // include: { 'company': { 'nested': 'field1,field2' } }
    } else {
      collapseIncludePaths(`${basePath}.${key}`, value, paths);
    }
  }
}

/**
 * Sorts query params by both key and value, returning a query params string
 *
 * Treats `included` specially, splicing it into an array if it is a string and sorting the array.
 *   - If `included` is an object we build paths dynamically for you
 * Treats `fields` specially, building JSON:API partial fields params from an object
 * Treats `page` specially, building cursor-pagination profile page params from an object
 *
 * ```ts
 * const params = buildQueryParams({
 *  include: {
 *    company: {
 *      locations: 'address'
 *    }
 *  },
 *   fields: {
 *     company: ['name', 'ticker'],
 *     person: 'name'
 *   },
 *   page: {
 *     size: 10,
 *     after: 'abc',
 *   }
 * });
 *
 * // => 'fields[company]=name,ticker&fields[person]=name&include=company.locations,company.locations.address&page[after]=abc&page[size]=10'
 * ```
 *
 * Options:
 * - arrayFormat: 'bracket' | 'indices' | 'repeat' | 'comma'
 *
 * 'bracket': appends [] to the key for every value e.g. `ids[]=1&ids[]=2`
 * 'indices': appends [i] to the key for every value e.g. `ids[0]=1&ids[1]=2`
 * 'repeat': appends the key for every value e.g. `ids=1&ids=2`
 * 'comma' (default): appends the key once with a comma separated list of values e.g. `ids=1,2`
 *
 * @method buildQueryParams
 * @static
 * @public
 * @for @ember-data/json-api/request
 * @param {URLSearchParams | object} params
 * @param {object} [options]
 * @return {string} A sorted query params string without the leading `?`
 */
export function buildQueryParams(query: JsonApiQuery | QueryParamsSource): string {
  if (query instanceof URLSearchParams) {
    return buildParams(query);
  }

  if (!isJsonApiQuery(query)) {
    return buildParams(query);
  }

  const { include, fields, page, ...rest } = query;
  const finalQuery: QueryParamsSource = {
    ...rest,
  };

  if ('include' in query) {
    // include: { 'company': 'field1,field2' }
    // include: { 'company': ['field1', 'field2'] }
    // include: { 'company': { 'nested': 'field1,field2' } }
    // include: { 'company': { 'nested': ['field1', 'field2'] } }
    if (include && !Array.isArray(include) && typeof include === 'object') {
      const includePaths: string[] = [];
      collapseIncludePaths('', include, includePaths);
      finalQuery.include = includePaths.sort();

      // include: 'field1,field2'
      // include: ['field1', 'field2']
    } else {
      finalQuery.include = include as string;
    }
  }

  if (fields) {
    const keys = Object.keys(fields).sort();
    for (let i = 0; i < keys.length; i++) {
      const resourceType = keys[i];
      const value = fields[resourceType];

      // fields: { 'company': ['field1', 'field2'] }
      if (Array.isArray(value)) {
        finalQuery[`fields[${resourceType}]`] = value.sort().join(',');

        // fields: { 'company': 'field1' }
        // fields: { 'company': 'field1,field2' }
      } else {
        finalQuery[`fields[${resourceType}]`] = value.split(',').sort().join(',');
      }
    }
  }

  if (page) {
    const keys = Object.keys(page).sort() as Array<'size' | 'after' | 'before'>;
    keys.forEach((key) => {
      const value = page[key];
      finalQuery[`page[${key}]`] = value!;
    });
  }

  return buildParams(finalQuery);
}
