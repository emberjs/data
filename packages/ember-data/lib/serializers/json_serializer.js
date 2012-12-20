require('ember-data/system/serializer');
require('ember-data/transforms/json_transforms');

var get = Ember.get, set = Ember.set;

var generatedId = 0;

DS.JSONSerializer = DS.Serializer.extend({
  init: function() {
    this._super();

    if (!get(this, 'transforms')) {
      this.set('transforms', DS.JSONTransforms);
    }

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

  addId: function(data, key, id) {
    data[key] = id;
  },

  /**
    A hook you can use to customize how the key/value pair is added to
    the serialized data.

    @param {any} hash the JSON hash being built
    @param {String} key the key to add to the serialized data
    @param {any} value the value to add to the serialized data
  */
  addAttribute: function(hash, key, value) {
    hash[key] = value;
  },

  /**
    @private

    Creates an empty hash that will be filled in by the hooks called from the
    `serialize()` method.

    @return {Object}
  */
  createSerializedForm: function() {
    return {};
  },

  extractAttribute: function(type, hash, attributeName) {
    var key = this._keyForAttributeName(type, attributeName);
    return hash[key];
  },

  extractId: function(type, hash) {
    var primaryKey = this._primaryKey(type);

    if (hash.hasOwnProperty(primaryKey)) {
      // Ensure that we coerce IDs to strings so that record
      // IDs remain consistent between application runs; especially
      // if the ID is serialized and later deserialized from the URL,
      // when type information will have been lost.
      return hash[primaryKey]+'';
    } else {
      return null;
    }
  },

  extractHasMany: function(type, hash, key) {
    return hash[key];
  },

  extractBelongsTo: function(type, hash, key) {
    return hash[key];
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var type = record.constructor,
        name = relationship.key,
        value = null,
        embeddedChild;

    if (this.embeddedType(type, name)) {
      if (embeddedChild = get(record, name)) {
        value = this.serialize(embeddedChild, { include: true });
      }

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

  // EXTRACTION

  meta: 'meta',
  since: 'since',

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
          sideloadedType = get(Ember.lookup, sideloadedType);
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
  }
});
