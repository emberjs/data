var get = Ember.get, set = Ember.set;

var passthrough = {
  fromJSON: function(value) {
    return value;
  },

  toJSON: function(value) {
    return value;
  }
};

DS.Serializer = Ember.Object.extend({
  init: function() {
    // By default, the JSON types are passthrough transforms
    this.transforms = {
      'string': passthrough,
      'number': passthrough,
      'boolean': passthrough
    };

    this.mappings = Ember.Map.create();
  },

  /**
    NAMING CONVENTIONS

    The most commonly overridden APIs of the serializer are
    the naming convention methods:

    * `keyForAttributeName`: converts a camelized attribute name
      into a key in the adapter-provided data hash. For example,
      if the model's attribute name was `firstName`, and the
      server used underscored names, you would return `first_name`.
    * `primaryKey`: returns the key that should be used to
      extract the id from the adapter-provided data hash. It is
      also used when serializing a record.
  */

  _keyForAttributeName: function(type, name) {
    return this._keyForJSONKey('keyForAttributeName', type, name);
  },

  keyForAttributeName: function(type, name) {
    return name;
  },

  _keyForBelongsTo: function(type, name) {
    return this._keyForJSONKey('keyForBelongsTo', type, name);
  },

  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name);
  },

  _keyForHasMany: function(type, name) {
    return this._keyForJSONKey('keyForHasMany', type, name);
  },

  keyForHasMany: function(type, name) {
    return this.keyForAttributeName(type, name);
  },

  _keyForJSONKey: function(publicMethod, type, name) {
    var mapping = this.mappingForType(type),
        mappingOptions = mapping && mapping[name],
        key = mappingOptions && mappingOptions.key;

    if (key) {
      return key;
    } else {
      return this[publicMethod](type, name);
    }
  },

  _primaryKey: function(type) {
    var mapping = this.mappingForType(type),
        primaryKey = mapping && mapping.primaryKey;

    if (primaryKey) {
      return primaryKey;
    } else {
      return this.primaryKey(type);
    }
  },

  primaryKey: function(type) {
    return "id";
  },

  /**
    SERIALIZATION

    These methods are responsible for taking a record and
    producing a JSON object.

    These methods are designed in layers, like a delicious 7-layer
    cake (but with fewer layers).

    The main entry point for serialization is the `toJSON`
    method, which takes the record and options.

    The `toJSON` method is responsible for:

    * turning the record's attributes (`DS.attr`) into
      attributes on the JSON object.
    * optionally adding the record's ID onto the hash
    * adding relationships (`DS.hasMany` and `DS.belongsTo`)
      to the JSON object.

    Depending on the backend, the serializer can choose
    whether to include the `hasMany` or `belongsTo`
    relationships on the JSON hash.

    For very custom serialization, you can implement your
    own `toJSON` method. In general, however, you will want
    to override the hooks described below.

    ## Adding the ID

    The default `toJSON` will optionally call your serializer's
    `addId` method with the JSON hash it is creating, the
    record's type, and the record's ID. The `toJSON` method
    will not call `addId` if the record's ID is undefined.

    Your adapter must specifically request ID inclusion by
    passing `{ includeId: true }` as an option to `toJSON`.

    NOTE: You may not want to include the ID when updating an
    existing record, because your server will likely disallow
    changing an ID after it is created, and the PUT request
    itself will include the record's identification.

    By default, `addId` will:

    1. Get the primary key name for the record by calling
       the serializer's `primaryKey` with the record's type.
       Unless you override the `primaryKey` method, this
       will be `'id'`.
    2. Assign the record's ID to the primary key in the
       JSON hash being built.

    If your backend expects a JSON object with the primary
    key at the root, you can just override the `primaryKey`
    method on your serializer subclass.

    Otherwise, you can override the `addId` method for
    more specialized handling.

    ## Adding Attributes

    By default, the serializer's `toJSON` method will call
    `addAttributes` with the JSON object it is creating
    and the record to serialize.

    The `addAttributes` method will then call `addAttribute`
    in turn, with the JSON object, the record to serialize,
    the attribute's name and its type.

    Finally, the `addAttribute` method will serialize the
    attribute:

    1. It will call `keyForAttributeName` to determine
       the key to use in the JSON hash.
    2. It will get the value from the record.
    3. It will call `transformValueToJSON` with the attribute's
       value and attribute type to convert it into a
       JSON-compatible value. For example, it will convert a
       Date into a String.

    If your backend expects a JSON object with attributes as
    keys at the root, you can just override the `transformValueToJSON`
    and `keyForAttributeName` methods in your serializer
    subclass and let the base class do the heavy lifting.

    If you need something more specialized, you can probably
    override `addAttribute` and let the default `addAttributes`
    handle the nitty gritty.

    ## Adding Relationships

    By default, `toJSON` will call your serializer's
    `addRelationships` method with the JSON object that is
    being built and the record being serialized. The default
    implementation of this method is to loop over all of the
    relationships defined on your record type and:

    * If the relationship is a `DS.hasMany` relationship,
      call `addHasMany` with the JSON object, the record
      and a description of the relationship.
    * If the relationship is a `DS.belongsTo` relationship,
      call `addBelongsTo` with the JSON object, the record
      and a description of the relationship.

    The relationship description has the following keys:

    * `type`: the class of the associated information (the
      first parameter to `DS.hasMany` or `DS.belongsTo`)
    * `kind`: either `hasMany` or `belongsTo`

    The relationship description may get additional
    information in the future if more capabilities or
    relationship types are added. However, it will
    remain backwards-compatible, so the mere existence
    of new features should not break existing adapters.
  */

  transformValueToJSON: function(value, attributeType) {
    var transform = this.transforms[attributeType];

    Ember.assert("You tried to use an attribute type (" + attributeType + ") that has not been registered", transform);
    return transform.toJSON(value);
  },

  toJSON: function(record, options) {
    options = options || {};

    var hash = {}, id;

    if (options.includeId) {
      if (id = get(record, 'id')) {
        this.addId(hash, record.constructor, id);
      }
    }

    this.addAttributes(hash, record);

    this.addRelationships(hash, record);

    return hash;
  },

  addAttributes: function(hash, record) {
    record.eachAttribute(function(name, attribute) {
      this.addAttribute(hash, record, name, attribute.type);
    }, this);
  },

  addAttribute: function(hash, record, attributeName, attributeType) {
    var key = this._keyForAttributeName(record.constructor, attributeName);
    var value = get(record, attributeName);

    hash[key] = this.transformValueToJSON(value, attributeType);
  },

  addId: function(hash, type, id) {
    var primaryKey = this._primaryKey(type);

    hash[primaryKey] = this.serializeId(id);
  },

  addRelationships: function(hash, record) {
    record.eachAssociation(function(name, relationship) {
      var key;

      if (relationship.kind === 'belongsTo') {
        key = this._keyForBelongsTo(record.constructor, name);

        this.addBelongsTo(hash, record, key, relationship);
      } else if (relationship.kind === 'hasMany') {
        key = this._keyForHasMany(record.constructor, name);

        this.addHasMany(hash, record, key, relationship);
      }
    }, this);
  },

  addBelongsTo: Ember.K,
  addHasMany: Ember.K,

  /**
   Allows IDs to be normalized before being sent back to the
   persistence layer. Because the store coerces all IDs to strings
   for consistency, this is the opportunity for the serializer to,
   for example, convert numerical IDs back into number form.
  */
  serializeId: function(id) {
    if (isNaN(id)) { return id; }
    return +id;
  },

  serializeIds: function(ids) {
    return Ember.EnumerableUtils.map(ids, function(id) {
      return this.serializeId(id);
    }, this);
  },

  /**
    DESERIALIZATION
  */

  transformValueFromJSON: function(value, attributeType) {
    var transform = this.transforms[attributeType];

    Ember.assert("You tried to use a attribute type (" + attributeType + ") that has not been registered", transform);
    return transform.fromJSON(value);
  },

  materializeFromJSON: function(record, hash) {
    if (Ember.none(get(record, 'id'))) {
      record.materializeId(this.extractId(record.constructor, hash));
    }

    this.materializeAttributes(record, hash);
    this.materializeRelationships(record, hash);
  },

  materializeAttributes: function(record, hash) {
    record.eachAttribute(function(name, attribute) {
      this.materializeAttribute(record, hash, name, attribute.type);
    }, this);
  },

  materializeAttribute: function(record, hash, attributeName, attributeType) {
    var value = this.extractAttribute(record.constructor, hash, attributeName);
    value = this.transformValueFromJSON(value, attributeType);

    record.materializeAttribute(attributeName, value);
  },

  extractAttribute: function(type, hash, attributeName) {
    var key = this._keyForAttributeName(type, attributeName);
    return hash[key];
  },

  extractId: function(type, hash) {
    var primaryKey = this._primaryKey(type);

    // Ensure that we coerce IDs to strings so that record
    // IDs remain consistent between application runs; especially
    // if the ID is serialized and later deserialized from the URL,
    // when type information will have been lost.
    return hash[primaryKey]+'';
  },

  materializeRelationships: function(record, hash) {
    record.eachAssociation(function(name, relationship) {
      if (relationship.kind === 'hasMany') {
        record.materializeHasMany(name, this.extractHasMany(record, hash, relationship));
      } else if (relationship.kind === 'belongsTo') {
        record.materializeBelongsTo(name, this.extractBelongsTo(record, hash, relationship));
      }
    }, this);
  },

  extractHasMany: function(record, hash, relationship) {
    var key = this._keyForHasMany(record.constructor, relationship.key);
    return hash[key];
  },

  extractBelongsTo: function(record, hash, relationship) {
    var key = this._keyForBelongsTo(record.constructor, relationship.key);
    return hash[key];
  },

  /**
    TRANSFORMS
  */

  registerTransform: function(type, transform) {
    this.transforms[type] = transform;
  },

  /**
    MAPPING CONVENIENCE
  */

  map: function(type, mappings) {
    this.mappings.set(type, mappings);
  },

  mappingForType: function(type) {
    this._reifyMappings();
    return this.mappings.get(type);
  },

  _reifyMappings: function() {
    if (this._didReifyMappings) { return; }

    var mappings = this.mappings,
        reifiedMappings = Ember.Map.create();

    mappings.forEach(function(key, mapping) {
      if (typeof key === 'string') {
        var type = Ember.get(window, key);
        Ember.assert("Could not find model at path" + key, type);

        reifiedMappings.set(type, mapping);
      } else {
        reifiedMappings.set(key, mapping);
      }
    });

    this.mappings = reifiedMappings;

    this._didReifyMappings = true;
  }
});

