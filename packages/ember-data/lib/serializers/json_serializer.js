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

    this.configure({
      meta: 'meta',
      since: 'since'
    });
  },

  configure: function(type, configuration) {
    if (type && !configuration) {
      return this._super(type);
    }

    var sideloadAs = configuration.sideloadAs;

    if (sideloadAs) {
      this.sideloadMapping.set(sideloadAs, type);

      // Set a flag indicating that mappings may need to be normalized
      // (i.e. converted from strings -> types) before sideloading.
      // We can't do this conversion immediately here, because `configure`
      // may be called before certain types have been defined.
      this.sideloadMapping.normalized = false;

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
        value = this.serialize(embeddedChild, { includeId: true });
      }

      hash[key] = value;
    } else {
      var id = get(record, relationship.key+'.id');
      if (!Ember.isNone(id)) { hash[key] = id; }
    }
  },

  /**
    Adds a has-many relationship to the JSON hash being built.

    The default REST semantics are to only add a has-many relationship if it
    is embedded. If the relationship was initially loaded by ID, we assume that
    that was done as a performance optimization, and that changes to the
    has-many should be saved as foreign key changes on the child's belongs-to
    relationship.

    @param {Object} hash the JSON being built
    @param {DS.Model} record the record being serialized
    @param {String} key the JSON key into which the serialized relationship
      should be saved
    @param {Object} relationship metadata about the relationship being serialized
  */
  addHasMany: function(hash, record, key, relationship) {
    var type = record.constructor,
        name = relationship.key,
        serializedHasMany = [],
        manyArray, embeddedType;

    // If the has-many is not embedded, there is nothing to do.
    embeddedType = this.embeddedType(type, name);
    if (embeddedType !== 'always') { return; }

    // Get the DS.ManyArray for the relationship off the record
    manyArray = get(record, name);

    // Build up the array of serialized records
    manyArray.forEach(function (record) {
      serializedHasMany.push(this.serialize(record, { includeId: true }));
    }, this);

    // Set the appropriate property of the serialized JSON to the
    // array of serialized embedded records
    hash[key] = serializedHasMany;
  },

  // EXTRACTION

  extract: function(loader, json, type, record) {
    var root = this.rootForType(type);

    this.sideload(loader, type, json, root);
    this.extractMeta(loader, type, json);

    if (json[root]) {
      if (record) { loader.updateId(record, json[root]); }
      this.extractRecordRepresentation(loader, type, json[root]);
    }
  },

  extractMany: function(loader, json, type, records) {
    var root = this.rootForType(type);
    root = this.pluralize(root);

    this.sideload(loader, type, json, root);
    this.extractMeta(loader, type, json);

    if (json[root]) {
      var objects = json[root], references = [];
      if (records) { records = records.toArray(); }

      for (var i = 0; i < objects.length; i++) {
        if (records) { loader.updateId(records[i], objects[i]); }
        var reference = this.extractRecordRepresentation(loader, type, objects[i]);
        references.push(reference);
      }

      loader.populateArray(references);
    }
  },

  extractMeta: function(loader, type, json) {
    var meta = json[this.configOption(type, 'meta')], since;
    if (!meta) { return; }

    if (since = meta[this.configOption(type, 'since')]) {
      loader.sinceForType(type, since);
    }
  },

  /**
    @private

    Iterates over the `json` payload and attempts to load any data
    included alongside `root`.

    The keys expected for sideloaded data are based upon the types related
    to the root model. Recursion is used to ensure that types related to
    related types can be loaded as well. Any custom keys specified by
    `sideloadAs` mappings will also be respected.

    @param {DS.Store subclass} loader
    @param {DS.Model subclass} type
    @param {Object} json
    @param {String} root
  */
  sideload: function(loader, type, json, root) {
    var sideloadedType;

    this.normalizeSideloadMappings();
    this.configureSideloadMappingForType(type);

    for (var prop in json) {
      if (!json.hasOwnProperty(prop) ||
          prop === root ||
          prop === this.configOption(type, 'meta')) {
        continue;
      }

      sideloadedType = this.sideloadMapping.get(prop);
      Ember.assert("Your server returned a hash with the key " + prop +
                   " but you have no mapping for it",
                   !!sideloadedType);

      this.loadValue(loader, sideloadedType, json[prop]);
    }
  },

  /**
    @private

    Iterates over all the `sideloadAs` mappings and converts any that are
    strings to their equivalent types.

    This is an optimization used to avoid performing lookups for every
    call to `sideload`.
  */
  normalizeSideloadMappings: function() {
    if (! this.sideloadMapping.normalized) {
      this.sideloadMapping.forEach(function(key, value) {
        if (typeof value === 'string') {
          this.sideloadMapping.set(key, get(Ember.lookup, value));
        }
      }, this);
      this.sideloadMapping.normalized = true;
    }
  },

  /**
    @private

    Configures possible sideload mappings for the types related to a
    particular model. This recursive method ensures that sideloading
    works for related models as well.

    @param {DS.Model subclass} type
    @param {Ember.A} configured an array of types that have already been configured
  */
  configureSideloadMappingForType: function(type, configured) {
    if (!configured) {configured = Ember.A([]);}
    configured.pushObject(type);

    type.eachRelatedType(function(relatedType) {
      if (!configured.contains(relatedType)) {
        var root = this.sideloadMappingForType(relatedType);
        if (!root) {
          root = this.defaultSideloadRootForType(relatedType);
          this.sideloadMapping.set(root, relatedType);
        }
        this.configureSideloadMappingForType(relatedType, configured);
      }
    }, this);
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
    var plurals = this.configurations.get('plurals');
    return (plurals && plurals[name]) || name + "s";
  },

  // use the same plurals hash to determine
  // special-case singularization
  singularize: function(name) {
    var plurals = this.configurations.get('plurals');
    if (plurals) {
      for (var i in plurals) {
        if (plurals[i] === name) {
          return i;
        }
      }
    }
    if (name.lastIndexOf('s') === name.length - 1) {
      return name.substring(0, name.length - 1);
    } else {
      return name;
    }
  },

  /**
    @private

    Determines the singular root name for a particular type.

    This is an underscored, lowercase version of the model name.
    For example, the type `App.UserGroup` will have the root
    `user_group`.

    @param {DS.Model subclass} type
    @returns {String} name of the root element
  */
  rootForType: function(type) {
    var typeString = type.toString();

    Ember.assert("Your model must not be anonymous. It was " + type, typeString.charAt(0) !== '(');

    // use the last part of the name as the URL
    var parts = typeString.split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },

  /**
    @private

    Determines the root name mapped to a particular sideloaded type.

    @param {DS.Model subclass} type
    @returns {String} name of the root element, if any is registered
  */
  sideloadMappingForType: function(type) {
    this.sideloadMapping.forEach(function(key, value) {
      if (type === value) {
        return key;
      }
    });
  },

  /**
    @private

    The default root name for a particular sideloaded type.

    @param {DS.Model subclass} type
    @returns {String} name of the root element
  */
  defaultSideloadRootForType: function(type) {
    return this.pluralize(this.rootForType(type));
  }
});
