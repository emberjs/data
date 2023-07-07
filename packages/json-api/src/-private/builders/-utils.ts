import { type UrlOptions, buildQueryParams } from "@ember-data/request-utils";
import type { CacheOptions, ConstrainedFindOptions } from "./-types";
import { assert } from "@ember/debug";

export function addInclude(url: string, options: ConstrainedFindOptions): string {
  assert(`Expected include to be a string or array, got ${typeof options.include}`, typeof options.include === 'string' || Array.isArray(options.include));
  const include = typeof options.include === 'string' ? options.include.split(',') : options.include;
  const query = buildQueryParams({ include }, options.urlParamsSettings);

  return `${url}?${query}`;
}

export function copyForwardUrlOptions(urlOptions: UrlOptions, options: ConstrainedFindOptions): void {
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

export function extractCacheOptions(options: ConstrainedFindOptions) {
  const cacheOptions: CacheOptions = {};
  if ("reload" in options) {
    cacheOptions.reload = options.reload;
  }
  if ("backgroundReload" in options) {
    cacheOptions.backgroundReload = options.backgroundReload;
  }
  return cacheOptions;
}
