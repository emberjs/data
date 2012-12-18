var get = Ember.get, map = Ember.ArrayPolyfills.map;

DS.RESTSerializer = DS.JSONSerializer.extend({
  meta: 'meta',
  since: 'since',

  init: function() {
    this._super();
    this.sideloadMapping = Ember.Map.create();
  },

  configure: function(type, configuration) {
    var sideloadAs = configuration.sideloadAs;

    if (sideloadAs) {
      this.sideloadMapping.set(sideloadAs, type);
      delete configuration.sideloadAs;
    }

    this._super.apply(this, arguments);
  },

  extract: function(loader, json, type) {
    var root = this.rootForType(type);

    this.sideload(loader, type, json, root);
    this.extractMeta(loader, type, json);

    if (json[root]) {
      this.extractRecordRepresentation(loader, type, json[root]);
    }
  },

  extractMany: function(loader, json, type) {
    var root = this.rootForType(type);
    root = this.pluralize(root);

    this.sideload(loader, type, json, root);
    this.extractMeta(loader, type, json);

    if (json[root]) {
      loader.loadMany(type, json[root]);
    }
  },

  extractRecordRepresentation: function(loader, type, json) {
    var mapping = this.mappingForType(type);
    var embeddedData, prematerialized = {};

    var associations = type.eachAssociation(function(name, association) {
      if (!mapping || !mapping[name]) { return; }

      if (mapping[name].embedded) {
        embeddedData = json[this.keyFor(association)];

        if (embeddedData) {
          if (association.kind === 'belongsTo') {
            this.extractEmbeddedBelongsTo(loader, association, embeddedData, prematerialized);
          } else if (association.kind === 'hasMany') {
            this.extractEmbeddedHasMany(loader, association, embeddedData, prematerialized);
          }
        }
      }
    }, this);

    loader.load(type, json, prematerialized);
  },

  extractEmbeddedHasMany: function(loader, association, array, prematerialized) {
    var references = map.call(array, function(item) {
      return loader.load(association.type, item);
    });

    prematerialized[association.key] = references;
  },

  extractEmbeddedBelongsTo: function(loader, association, data, prematerialized) {
    var recordReference = loader.load(association.type, data);
    prematerialized[association.key] = recordReference;
  },

  extractMeta: function(loader, type, json) {
    var meta = json[get(this, 'meta')], since;
    if (!meta) { return; }

    if (since = meta[get(this, 'since')]) {
      loader.sinceForType(type, since);
    }
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
        sideloadedType = this.sideloadMapping.get(prop);

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
        loader.sideload(type, value[i]);
      }
    } else {
      loader.sideload(type, value);
    }
  },

  // HELPERS

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
    var mapping = this.mappingForType(type);

    var key = this.keyForAttributeName(type, name);

    if (mapping && mapping[name] && mapping[name].embedded) {
      return key;
    }

    return key + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var id = get(record, relationship.key+'.id');

    if (!Ember.isNone(id)) { hash[key] = id; }
  }
});
