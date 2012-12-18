var get = Ember.get;

DS.RESTSerializer = DS.JSONSerializer.extend({
  extract: function(loader, json, options) {
    var type = options.type,
        root = this.rootForType(type),
        id = options.id;

    loader.loadMain(type, json[root], { id: id });

    this.sideload(loader, type, json, root);
  },

  sideload: function(loader, type, json, root) {
    var sideloadedType, mappings, loaded = {};

    loaded[root] = true;

    for (var prop in json) {
      if (!json.hasOwnProperty(prop)) { continue; }
      if (prop === root) { continue; }
      if (prop === get(this, 'meta')) { continue; }

      sideloadedType = type.typeForAssociation(prop);

      if (!sideloadedType) {
        mappings = get(this, 'mappings');
        Ember.assert("Your server returned a hash with the key " + prop + " but you have no mappings", !!mappings);

        sideloadedType = get(mappings, prop);

        if (typeof sideloadedType === 'string') {
          sideloadedType = get(window, sideloadedType);
        }

        Ember.assert("Your server returned a hash with the key " + prop + " but you have no mapping for it", !!sideloadedType);
      }

      this.sideloadAssociations(loader, sideloadedType, json, prop, loaded);
    }
  },

  sideloadAssociations: function(loader, type, json, prop, loaded) {
    loaded[prop] = true;

    get(type, 'associationsByName').forEach(function(key, meta) {
      key = meta.key || key;
      if (meta.kind === 'belongsTo') {
        key = this.pluralize(key);
      }
      if (json[key] && !loaded[key]) {
        this.sideloadAssociations(loader, meta.type, json, key, loaded);
      }
    }, this);

    this.loadValue(loader, type, json[prop]);
  },

  loadValue: function(loader, type, value) {
    if (value instanceof Array) {
      for (var i=0; i < value.length; i++) {
        loader.load(type, value[i]);
      }
    } else {
      loader.load(type, value);
    }
  },

  // HELPERS

  plurals: {},

  // define a plurals hash in your subclass to define
  // special-case pluralization
  pluralize: function(name) {
    return this.plurals[name] || name + "s";
  },

  rootForType: function(type) {
    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },

  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var id = get(record, relationship.key+'.id');

    if (!Ember.none(id)) { hash[key] = id; }
  }
});
