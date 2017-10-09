/* global heimdall */
import { set } from '@ember/object';

const  {
  __get,
  _instanceFor
} = heimdall.registerMonitor('system.store.container-instance-cache',
  '__get',
  '_instanceFor'
);

/*
 * The `ContainerInstanceCache` serves as a lazy cache for looking up
 * instances of serializers and adapters. It has some additional logic for
 * finding the 'fallback' adapter or serializer.
 *
 * The 'fallback' adapter or serializer is an adapter or serializer that is looked up
 * when the preferred lookup fails. For example, say you try to look up `adapter:post`,
 * but there is no entry (app/adapters/post.js in EmberCLI) for `adapter:post` in the registry.
 *
 * When an adapter or serializer is unfound, getFallbacks will be invoked with the current namespace
 * ('adapter' or 'serializer') and the 'preferredKey' (usually a modelName).  The method should return
 * an array of keys to check against.
 *
 * The first entry in the fallbacks array that exists in the container will then be cached for
 * `adapter:post`. So, the next time you look up `adapter:post`, you'll get the `adapter:application`
 * instance (or whatever the fallback was if `adapter:application` doesn't exist).
 *
 * @private
 * @class ContainerInstanceCache
 *
*/
export default class ContainerInstanceCache {
  constructor(owner, store) {
    this.isDestroying = false;
    this.isDestroyed = false;
    this._owner = owner;
    this._store = store;
    this._namespaces = {
      adapter: Object.create(null),
      serializer: Object.create(null)
    };
  }

  get(namespace, preferredKey) {
    heimdall.increment(__get);
    let cache = this._namespaces[namespace];

    if (cache[preferredKey]) {
      return cache[preferredKey];
    }

    let preferredLookupKey = `${namespace}:${preferredKey}`;

    let instance = this._instanceFor(preferredLookupKey) || this._findInstance(namespace, this._fallbacksFor(namespace, preferredKey));
    if (instance) {
      cache[preferredKey] = instance;
      set(instance, 'store', this._store);
    }

    return cache[preferredKey];
  }

  _fallbacksFor(namespace, preferredKey) {
    if (namespace === 'adapter') {
      return ['application', this._store.get('adapter'), '-json-api'];
    }

    // serializer
    return [
      'application',
      this.get('adapter', preferredKey).get('defaultSerializer'),
      '-default'
    ];
  }

  _findInstance(namespace, fallbacks) {
    let cache = this._namespaces[namespace];

    for (let i = 0, length = fallbacks.length; i < length; i++) {
      let fallback = fallbacks[i];

      if (cache[fallback]) {
        return cache[fallback];
      }

      let lookupKey = `${namespace}:${fallback}`;
      let instance = this._instanceFor(lookupKey);

      if (instance) {
        cache[fallback] = instance;
        return instance;
      }
    }
  }

  _instanceFor(key) {
    heimdall.increment(_instanceFor);
    return this._owner.lookup(key);
  }

  destroyCache(cache) {
    let cacheEntries = Object.keys(cache);

    for (let i = 0, length = cacheEntries.length; i < length; i++) {
      let cacheKey = cacheEntries[i];
      let cacheEntry = cache[cacheKey];
      if (cacheEntry) {
        cacheEntry.destroy();
      }
    }
  }

  destroy() {
    this.isDestroying = true;
    this.destroyCache(this._namespaces.adapter);
    this.destroyCache(this._namespaces.serializer);
    this.isDestroyed = true;
  }

  toString() {
    return 'ContainerInstanceCache';
  }
}
