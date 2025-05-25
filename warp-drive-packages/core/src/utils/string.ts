import { DEBUG } from '@warp-drive/core/build-config/env';

const DEFAULT_MAX_CACHE_SIZE = 10_000;

/**
 * An LRUCache implementation with upsert semantics.
 *
 * This implementation is *not* generic, but focuses on
 * performance tuning for the string transformation cases
 * where the key maps to the value very simply.
 *
 * It takes a work function that should generate a new value
 * for a given key when called. It will be called when the key
 * is not found in the cache.
 *
 * It keeps track of the number of hits, misses, and ejections
 * in DEBUG envs, which is useful for tuning the cache size.
 *
 * This is an internal utility class for use by this module
 * and by `@warp-drive/utilities/string`. It is not intended
 * for use outside of these modules at this time.
 *
 * @internal
 */
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
export const STRING_DASHERIZE_CACHE = new LRUCache<string, string>((key: string) =>
  key.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase().replace(STRING_DASHERIZE_REGEXP, '-')
);

/**
 * This is an internal utility function that converts a string
 * to a dasherized format. Library consumers should use the
 * re-exported version from `@warp-drive/utilities/string` instead.
 *
 * This version is only in this location to support a deprecated
 * behavior in the core package and will be removed in a future.
 *
 * @internal
 */
export function dasherize(str: string): string {
  return STRING_DASHERIZE_CACHE.get(str);
}
