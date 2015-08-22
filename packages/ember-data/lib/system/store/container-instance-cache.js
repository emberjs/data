import Ember from 'ember';

import {
  keysFunc
} from 'ember-data/system/object-polyfills';

import EmptyObject from "ember-data/system/empty-object";

/**
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
function ContainerInstanceCache(container) {
  this._container  = container;
  this._cache      = new EmptyObject();
}

ContainerInstanceCache.prototype = new EmptyObject();

Ember.merge(ContainerInstanceCache.prototype, {
  get: function(type, preferredKey, fallbacks) {
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

  _findInstance: function(type, fallbacks) {
    for (let i = 0, length = fallbacks.length; i < length; i++) {
      let fallback = fallbacks[i];
      let lookupKey = `${type}:${fallback}`;
      let instance = this.instanceFor(lookupKey);

      if (instance) {
        return instance;
      }
    }
  },

  instanceFor: function(key) {
    if (key === 'adapter:-rest') {
      Ember.deprecate('You are currently using the default DS.RESTAdapter adapter. For Ember 2.0 the default adapter will be DS.JSONAPIAdapter. If you would like to continue using DS.RESTAdapter please create an application adapter that extends DS.RESTAdapter.', false, {
        id: 'ds.adapter.default-adapter-changing-to-json-api',
        until: '2.0.0'
      });
    }

    let cache = this._cache;
    if (!cache[key]) {
      let instance = this._container.lookup(key);
      if (instance) {
        cache[key] = instance;
      }
    }
    return cache[key];
  },

  destroy: function() {
    let cache = this._cache;
    let cacheEntries = keysFunc(cache);

    for (let i = 0, length = cacheEntries.length; i < length; i++) {
      let cacheKey = cacheEntries[i];
      let cacheEntry = cache[cacheKey];
      if (cacheEntry) {
        cacheEntry.destroy();
      }
    }
    this._container = null;
  },

  constructor: ContainerInstanceCache,

  toString: function() {
    return 'ContainerInstanceCache';
  }
});

export default ContainerInstanceCache;
