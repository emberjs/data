/**
 * String utilties for transforming and inflecting strings useful for
 * when the format provided by the server is not the format you want to use
 * in your application.
 *
 * Each transformation function stores its results in an LRUCache to avoid
 * recomputing the same value multiple times. The cache size can be set
 * using the `setMaxLRUCacheSize` function. The default size is 10,000.
 *
 * @module
 */
export {
  pluralize,
  singularize,
  singular,
  plural,
  loadIrregular,
  loadUncountable,
  irregular,
  uncountable,
  resetToDefaults,
  clear,
  clearRules,
} from './-private/string/inflect.ts';

export { dasherize, camelize, capitalize, underscore, setMaxLRUCacheSize } from './-private/string/transform.ts';
