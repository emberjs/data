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

    var reference = loader.load(type, json);

    this.eachEmbeddedHasMany(type, function(name, relationship) {
      var embeddedData = json[this.keyFor(relationship)];
      this.extractEmbeddedHasMany(loader, relationship, embeddedData, reference, prematerialized);
    }, this);

    this.eachEmbeddedBelongsTo(type, function(name, relationship) {
      var embeddedData = json[this.keyFor(relationship)];
      this.extractEmbeddedBelongsTo(loader, relationship, embeddedData, reference, prematerialized);
    }, this);

    loader.prematerialize(reference, prematerialized);
  },

  extractEmbeddedHasMany: function(loader, association, array, parent, prematerialized) {
    var references = map.call(array, function(item) {
      var reference = loader.load(association.type, item);
      reference.parent = parent;
      return reference;
    });

    prematerialized[association.key] = references;
  },

  extractEmbeddedBelongsTo: function(loader, association, data, parent, prematerialized) {
    var recordReference = loader.load(association.type, data);
    prematerialized[association.key] = recordReference;
    recordReference.parent = parent;
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
    var mapping = this.mappingForType(record.constructor);

    if (mapping && mapping[relationship.key] && mapping[relationship.key].embedded) {
      var embedded = get(record, relationship.key);
      var value = embedded ? this.serialize(embedded, { includeId: true }) : null;
      hash[key] = value;
    } else {
      var id = get(record, relationship.key+'.id');
      if (!Ember.isNone(id)) { hash[key] = id; }
    }
  },

  addHasMany: function(hash, record, key, relationship) {
    var array = [];

    this.eachEmbeddedHasManyRecord(record, function(embeddedRecord) {
      array.push(this.serialize(embeddedRecord, { includeId: true }));
    }, this);

    hash[key] = array;
  },

  // EMBEDDED HELPERS
  embeddedType: function(type, name) {
    var mapping = this.mappingForType(type)[name];

    return mapping && mapping.embedded;
  },

  eachEmbeddedRecord: function(record, callback, binding) {
    this.eachEmbeddedBelongsToRecord(record, callback, binding);
    this.eachEmbeddedHasManyRecord(record, callback, binding);
  },

  eachEmbeddedBelongsToRecord: function(record, callback, binding) {
    var type = record.constructor;

    this.eachEmbeddedBelongsTo(record.constructor, function(name, relationship, embeddedType) {
      var embeddedRecord = get(record, name);
      if (embeddedRecord) { callback.call(binding, embeddedRecord, embeddedType); }
    });
  },

  eachEmbeddedHasManyRecord: function(record, callback, binding) {
    var type = record.constructor;

    this.eachEmbeddedHasMany(record.constructor, function(name, relationship, embeddedType) {
      var array = get(record, name);
      for (var i=0, l=get(array, 'length'); i<l; i++) {
        callback.call(binding, array.objectAt(i), embeddedType);
      }
    });
  },

  eachEmbeddedHasMany: function(type, callback, binding) {
    this.eachEmbeddedRelationship(type, 'hasMany', callback, binding);
  },

  eachEmbeddedBelongsTo: function(type, callback, binding) {
    this.eachEmbeddedRelationship(type, 'belongsTo', callback, binding);
  },

  eachEmbeddedRelationship: function(type, kind, callback, binding) {
    type.eachAssociation(function(name, relationship) {
      var embeddedType = this.embeddedType(type, name);

      if (embeddedType) {
        if (relationship.kind === kind) {
          callback.call(binding, name, relationship, embeddedType);
        }
      }
    }, this);
  }
});
