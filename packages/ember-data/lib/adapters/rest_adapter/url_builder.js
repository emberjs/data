var get = Ember.get, set = Ember.set;

DS.URLBuilder = Ember.Object.extend({
  buildCreateURL: function(root, suffix) {
    return this.buildURL(root, suffix);
  },

  buildUpdateURL: function(root, suffix, record) {
    return this.buildURL(root, suffix, record);
  },

  buildDeleteURL: function(root, suffix, record) {
    return this.buildURL(root, suffix, record);
  },

  buildFindURL: function(root, suffix) {
    return this.buildURL(root, suffix);
  },

  buildFindAllURL: function(root, suffix) {
    return this.buildURL(root, suffix);
  },

  buildFindQueryURL: function(root, suffix) {
    return this.buildURL(root, suffix);
  },

  buildFindManyURL: function(root, suffix) {
    return this.buildURL(root, suffix);
  },

  /**
    @method buildURL
    @private
    @param root
    @param suffix
    @param record
  */
  buildURL: function(root, suffix, record) {
    var adapter = get(this, 'adapter'),
        url = [adapter.url];

    Ember.assert("Namespace URL (" + adapter.namespace + ") must not start with slash", !adapter.namespace || adapter.namespace.toString().charAt(0) !== "/");
    Ember.assert("Root URL (" + root + ") must not start with slash", !root || root.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (!Ember.isNone(adapter.namespace)) {
      url.push(adapter.namespace);
    }

    url.push(adapter.pluralize(root));
    if (suffix !== undefined) {
      url.push(suffix);
    }

    return url.join("/");
  }
});
