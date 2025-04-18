import type { UrlOptions } from '@ember-data/request-utils';
import type { ConstrainedRequestOptions } from '@warp-drive/core-types/builders';
import type { CacheOptions } from '@warp-drive/core-types/request';

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

export function extractCacheOptions(options: ConstrainedRequestOptions): CacheOptions {
  const cacheOptions: CacheOptions = {
    raw: false,
  };
  if ('reload' in options) {
    cacheOptions.reload = options.reload;
  }
  if ('backgroundReload' in options) {
    cacheOptions.backgroundReload = options.backgroundReload;
  }

  return cacheOptions;
}
