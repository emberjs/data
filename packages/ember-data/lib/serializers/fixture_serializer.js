require('ember-data/system/serializer');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;

/**
  @class FixtureSerializer
  @namespace DS
  @extends DS.Serializer
*/
DS.FixtureSerializer = DS.Serializer.extend({

  /**
    @method deserializeValue
    @param  value
    @param  attributeType
  */
  deserializeValue: function(value, attributeType) {
    return value;
  },

  /**
    @method serializeValue
    @param  value
    @param  attributeType
  */
  serializeValue: function(value, attributeType) {
    return value;
  },

  /**
    @method addId
    @param  data
    @param  key
    @param  id
  */
  addId: function(data, key, id) {
    data[key] = id;
  },

  /**
    @method addAttribute
    @param hash
    @param key
    @param value
  */
  addAttribute: function(hash, key, value) {
    hash[key] = value;
  },

  /**
    @method addBelongsTo
    @param hash
    @param record
    @param key
    @param relationship
  */
  addBelongsTo: function(hash, record, key, relationship) {
    var id = get(record, relationship.key+'.id');
    if (!Ember.isNone(id)) { hash[key] = id; }
  },

  /**
    @method addHasMany
    @param hash
    @param record
    @param key
    @param relationship
  */
  addHasMany: function(hash, record, key, relationship) {
    var ids = get(record, relationship.key).map(function(item) {
      return item.get('id');
    });

    hash[relationship.key] = ids;
  },

  /**
    @method extract
    @param loader
    @param fixture
    @param type
    @param record
  */
  extract: function(loader, fixture, type, record) {
    if (record) { loader.updateId(record, fixture); }
    this.extractRecordRepresentation(loader, type, fixture);
  },

  /**
    @method extractMany
    @param loader
    @param fixtures
    @param type
    @param records
  */
  extractMany: function(loader, fixtures, type, records) {
    var objects = fixtures, references = [];
    if (records) { records = records.toArray(); }

    for (var i = 0; i < objects.length; i++) {
      if (records) { loader.updateId(records[i], objects[i]); }
      var reference = this.extractRecordRepresentation(loader, type, objects[i]);
      references.push(reference);
    }

    loader.populateArray(references);
  },

  /**
    @method extractId
    @param type
    @param hash
  */
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

  /**
    @method extractAttribute
    @param type
    @param hash
    @param attributeName
  */
  extractAttribute: function(type, hash, attributeName) {
    var key = this._keyForAttributeName(type, attributeName);
    return hash[key];
  },

  /**
    @method extractHasMany
    @param type
    @param hash
    @param key
  */
  extractHasMany: function(type, hash, key) {
    return hash[key];
  },

  /**
    @method extractBelongsTo
    @param type
    @param hash
    @param key
  */
  extractBelongsTo: function(type, hash, key) {
    var val = hash[key];
    if (val != null) {
      val = val + '';
    }
    return val;
  },

  /**
    @method extractBelongsToPolymorphic
    @method type
    @method hash
    @method key
  */
  extractBelongsToPolymorphic: function(type, hash, key) {
    var keyForId = this.keyForPolymorphicId(key),
        keyForType,
        id = hash[keyForId];

    if (id) {
      keyForType = this.keyForPolymorphicType(key);
      return {id: id, type: hash[keyForType]};
    }

    return null;
  },

  /**
    @method keyForPolymorphicId
    @param key
  */
  keyForPolymorphicId: function(key) {
    return key;
  },

  /**
    @method keyForPolymorphicType
    @param key
  */
  keyForPolymorphicType: function(key) {
    return key + '_type';
  }
});
