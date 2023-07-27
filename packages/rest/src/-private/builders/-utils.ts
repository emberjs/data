import { type UrlOptions } from '@ember-data/request-utils';
import type { CacheOptions, ConstrainedRequestOptions } from '@ember-data/types/request';

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
