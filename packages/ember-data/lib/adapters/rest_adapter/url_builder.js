var get = Ember.get, set = Ember.set;

DS.URLBuilder = Ember.Object.extend({
  buildCreateURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  buildUpdateURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  buildDeleteURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  buildFindURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  buildFindAllURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  buildFindQueryURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  buildFindManyURL: function(root, suffix, recordOrData) {
    return this.buildURL(root, suffix, recordOrData);
  },

  /**
    @method buildURL
    @private
    @param root
    @param suffix
    @param recordOrData
  */
  buildURL: function(root, suffix, recordOrData) {
    var adapter = get(this, 'adapter'),
        url = [adapter.url],
        urlMap = adapter._configurationsMap.get('urls');

    Ember.assert("Namespace URL (" + adapter.namespace + ") must not start with slash", !adapter.namespace || adapter.namespace.toString().charAt(0) !== "/");
    Ember.assert("Root URL (" + root + ") must not start with slash", !root || root.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (!Ember.isNone(adapter.namespace)) {
      url.push(adapter.namespace);
    }

    if (!Ember.isNone(urlMap) && !Ember.isNone(urlMap[root]) && !Ember.isNone(recordOrData)) {
      var recordUrlMap = urlMap[root],
          modelUrl;

      modelUrl = recordUrlMap.replace(/:(\w+)/g, function(match, id) {
        return get(recordOrData, id);
      });

      url.push(modelUrl);
    } else {
      url.push(adapter.pluralize(root));
    }

    if (!Ember.isNone(suffix)) {
      url.push(suffix);
    }

    return url.join("/");
  }
});
