import Ember from 'ember';

function ContainerInstanceCache(container) {
  this._container  = container;
  this._cache      = Ember.create(null);
}

ContainerInstanceCache.prototype = {
  get(type, preferredKey, fallbacks) {
    var cache = this._cache;
    var preferredLookupKey = `${type}:${preferredKey}`;

    if (!(preferredLookupKey in cache)) {
      let instance = this.instanceFor(preferredLookupKey) || this._findInstance(fallbacks || []);
      if (instance) {
        cache[preferredLookupKey] = instance;
      }
    }
    return cache[preferredLookupKey];
  },

  _findInstance(fallbacks) {
    var i;
    var length = fallbacks.length;

    for (i = 0; i < length; i++) {
      let fallback = fallbacks[i];
      let instance = this.instanceFor(fallback);

      if (instance) {
        return instance;
      }
    }
  },

  instanceFor(key) {
    var cache = this._cache;
    if (!cache[key]) {
      cache[key] = this._container.lookup(key);
    }
    return cache[key];
  },

  destroy() {
    var cache = this._cache;
    var cacheEntries = Ember.keys(cache);
    var i;
    var length = cacheEntries.length;

    for (i = 0; i < length; i++) {
      let cacheKey = cacheEntries[i];
      let cacheEntry = cache[cacheKey];
      if (cacheEntry) {
        cacheEntry.destroy();
      }
    }
    this._container = null;
  },

  fallbackKey: 'application'
};

export default ContainerInstanceCache;
