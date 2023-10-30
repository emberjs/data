/**
 * @module @ember-data/json-api/request
 */
import { BuildURLConfig, setBuildURLConfig as setConfig } from '@ember-data/request-utils';
import { type UrlOptions } from '@ember-data/request-utils';
import type { CacheOptions, ConstrainedRequestOptions } from '@ember-data/types/request';

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
 * @returns void
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
