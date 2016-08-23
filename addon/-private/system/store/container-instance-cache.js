/* global heimdall */
import Ember from 'ember';
import EmptyObject from "ember-data/-private/system/empty-object";
const assign = Ember.assign || Ember.merge;

/*
 * The `ContainerInstanceCache` serves as a lazy cache for looking up
 * instances of serializers and adapters. It has some additional logic for
 * finding the 'fallback' adapter or serializer.
 *
 * The 'fallback' adapter or serializer is an adapter or serializer that is looked up
 * when the preferred lookup fails. For example, say you try to look up `adapter:post`,
 * but there is no entry (app/adapters/post.js in EmberCLI) for `adapter:post` in the registry.
 *
 * The `fallbacks` array passed will then be used; the first entry in the fallbacks array
 * that exists in the container will then be cached for `adapter:post`. So, the next time you
 * look up `adapter:post`, you'll get the `adapter:application` instance (or whatever the fallback
 * was if `adapter:application` doesn't exist).
 *
 * @private
 * @class ContainerInstanceCache
 *
*/
export default function ContainerInstanceCache(owner) {
  this._owner = owner;
  this._cache = new EmptyObject();
}

const  {
  __get,
  instanceFor
} = heimdall.registerMonitor('system.store.container-instance-cache',
  'get',
  'instanceFor'
);

ContainerInstanceCache.prototype = new EmptyObject();

assign(ContainerInstanceCache.prototype, {
  get(type, preferredKey, fallbacks) {
    heimdall.increment(__get);
    let cache = this._cache;
    let preferredLookupKey = `${type}:${preferredKey}`;

    if (!(preferredLookupKey in cache)) {
      let instance = this.instanceFor(preferredLookupKey) || this._findInstance(type, fallbacks);
      if (instance) {
        cache[preferredLookupKey] = instance;
      }
    }
    return cache[preferredLookupKey];
  },

  _findInstance(type, fallbacks) {
    for (let i = 0, length = fallbacks.length; i < length; i++) {
      let fallback = fallbacks[i];
      let lookupKey = `${type}:${fallback}`;
      let instance = this.instanceFor(lookupKey);

      if (instance) {
        return instance;
      }
    }
  },

  instanceFor(key) {
    heimdall.increment(instanceFor);
    let cache = this._cache;
    if (!cache[key]) {
      let instance = this._owner.lookup(key);
      if (instance) {
        cache[key] = instance;
      }
    }
    return cache[key];
  },

  destroy() {
    let cache = this._cache;
    let cacheEntries = Object.keys(cache);

    for (let i = 0, length = cacheEntries.length; i < length; i++) {
      let cacheKey = cacheEntries[i];
      let cacheEntry = cache[cacheKey];
      if (cacheEntry) {
        cacheEntry.destroy();
      }
    }
    this._owner = null;
  },

  constructor: ContainerInstanceCache,

  toString() {
    return 'ContainerInstanceCache';
  }
});
