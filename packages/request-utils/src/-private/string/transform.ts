import { DEBUG } from '@warp-drive/build-config/env';

const DEFAULT_MAX_CACHE_SIZE = 10_000;
export class LRUCache<T, V> {
  declare size: number;
  declare state: Map<T, V>;
  declare doWork: (k: T) => V;

  // debug stats
  declare _hits: number;
  declare _misses: number;
  declare _ejected: number;

  constructor(doWork: (k: T) => V, size?: number) {
    this.size = size || DEFAULT_MAX_CACHE_SIZE;
    this.state = new Map();
    this.doWork = doWork;

    if (DEBUG) {
      this._hits = 0;
      this._misses = 0;
      this._ejected = 0;
    }
  }
  get(key: T) {
    const value = this.state.get(key);
    if (value) {
      if (DEBUG) {
        this._hits++;
      }
      this.state.delete(key);
      this.state.set(key, value);
      return value;
    }
    if (DEBUG) {
      this._misses++;
    }

    const newValue = this.doWork(key);
    this.set(key, newValue);
    return newValue;
  }

  set(key: T, value: V) {
    if (this.state.size === this.size) {
      for (const [k] of this.state) {
        if (DEBUG) {
          this._ejected++;
        }
        this.state.delete(k);
        break;
      }
    }
    this.state.set(key, value);
  }

  clear() {
    this.state.clear();
    if (DEBUG) {
      this._hits = 0;
      this._misses = 0;
      this._ejected = 0;
    }
  }
}

const STRING_DASHERIZE_REGEXP = /[ _]/g;
const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;
const STRING_DASHERIZE_CACHE = new LRUCache<string, string>((key: string) =>
  key.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase().replace(STRING_DASHERIZE_REGEXP, '-')
);

// eslint-disable-next-line no-useless-escape
const STRING_CAMELIZE_REGEXP_1 = /(\-|\_|\.|\s)+(.)?/g;
const STRING_CAMELIZE_REGEXP_2 = /(^|\/)([A-Z])/g;
const CAMELIZE_CACHE = new LRUCache<string, string>((key: string) =>
  key
    .replace(STRING_CAMELIZE_REGEXP_1, (_match, _separator, chr: string | null) => (chr ? chr.toUpperCase() : ''))
    .replace(STRING_CAMELIZE_REGEXP_2, (match /*, separator, chr */) => match.toLowerCase())
);

const STRING_UNDERSCORE_REGEXP_1 = /([a-z\d])([A-Z]+)/g;
// eslint-disable-next-line no-useless-escape
const STRING_UNDERSCORE_REGEXP_2 = /\-|\s+/g;
const UNDERSCORE_CACHE = new LRUCache<string, string>((str: string) =>
  str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase()
);

const STRING_CAPITALIZE_REGEXP = /(^|\/)([a-z\u00C0-\u024F])/g;
const CAPITALIZE_CACHE = new LRUCache<string, string>((str: string) =>
  str.replace(STRING_CAPITALIZE_REGEXP, (match /*, separator, chr */) => match.toUpperCase())
);

/**
 * Replaces underscores, spaces, or camelCase with dashes.
 *
 * ```js
 * import { dasherize } from '@ember-data/request-utils/string';
 *
 * dasherize('innerHTML');                // 'inner-html'
 * dasherize('action_name');              // 'action-name'
 * dasherize('css-class-name');           // 'css-class-name'
 * dasherize('my favorite items');        // 'my-favorite-items'
 * dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
 * ```
 *
 * @public
 * @param {String} str
 * @return {String}
 * @since 4.13.0
 */
export function dasherize(str: string): string {
  return STRING_DASHERIZE_CACHE.get(str);
}

/**
 * Returns the lowerCamelCase form of a string.
 *
 * ```js
 * import { camelize } from '@ember-data/request-utils/string';
 *
 * camelize('innerHTML');                   // 'innerHTML'
 * camelize('action_name');                 // 'actionName'
 * camelize('css-class-name');              // 'cssClassName'
 * camelize('my favorite items');           // 'myFavoriteItems'
 * camelize('My Favorite Items');           // 'myFavoriteItems'
 * camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
 * ```
 *
 * @public
 * @param {String} str
 * @return {String}
 * @since 4.13.0
 */
export function camelize(str: string): string {
  return CAMELIZE_CACHE.get(str);
}

/**
 * Returns the lower\_case\_and\_underscored form of a string.
 *
 * ```js
 * import { underscore } from '@ember-data/request-utils/string';
 *
 * underscore('innerHTML');                 // 'inner_html'
 * underscore('action_name');               // 'action_name'
 * underscore('css-class-name');            // 'css_class_name'
 * underscore('my favorite items');         // 'my_favorite_items'
 * underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
 * ```
 *
 * @public
 * @param {String} str
 * @return {String}
 * @since 4.13.0
 */
export function underscore(str: string): string {
  return UNDERSCORE_CACHE.get(str);
}

/**
 * Returns the Capitalized form of a string
 *
 * ```js
 * import { capitalize } from '@ember-data/request-utils/string';
 *
 * capitalize('innerHTML')                 // 'InnerHTML'
 * capitalize('action_name')               // 'Action_name'
 * capitalize('css-class-name')            // 'Css-class-name'
 * capitalize('my favorite items')         // 'My favorite items'
 * capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
 * ```
 *
 * @public
 * @param {String} str
 * @return {String}
 * @since 4.13.0
 */
export function capitalize(str: string): string {
  return CAPITALIZE_CACHE.get(str);
}

/**
 * Sets the maximum size of the LRUCache for all string transformation functions.
 * The default size is 10,000.
 *
 * @public
 * @param {Number} size
 * @return {void}
 * @since 4.13.0
 */
export function setMaxLRUCacheSize(size: number) {
  CAMELIZE_CACHE.size = size;
  UNDERSCORE_CACHE.size = size;
  CAPITALIZE_CACHE.size = size;
  STRING_DASHERIZE_CACHE.size = size;
}
