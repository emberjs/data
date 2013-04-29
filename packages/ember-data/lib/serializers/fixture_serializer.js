require('ember-data/system/serializer');

/**
  @module data
  @submodule data-serializers
*/

/**
  @class FixtureSerializer
  @constructor
  @namespace DS
  @extends DS.Serializer
*/

var get = Ember.get, set = Ember.set;

DS.FixtureSerializer = DS.Serializer.extend({
  deserializeValue: function(value, attributeType) {
    return value;
  },

  serializeValue: function(value, attributeType) {
    return value;
  },

  addId: function(data, key, id) {
    data[key] = id;
  },

  addAttribute: function(hash, key, value) {
    hash[key] = value;
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var id = get(record, relationship.key+'.id');
    if (!Ember.isNone(id)) { hash[key] = id; }
  },

  addHasMany: function(hash, record, key, relationship) {
    var ids = get(record, relationship.key).map(function(item) {
      return item.get('id');
    });

    hash[relationship.key] = ids;
  },

  extract: function(loader, fixture, type, record) {
    if (record) { loader.updateId(record, fixture); }
    this.extractRecordRepresentation(loader, type, fixture);
  },

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

  extractAttribute: function(type, hash, attributeName) {
    var key = this._keyForAttributeName(type, attributeName);
    return hash[key];
  },

  extractHasMany: function(type, hash, key) {
    return hash[key];
  },

  extractBelongsTo: function(type, hash, key) {
    var val = hash[key];
    if (val !== null && val !== undefined) {
      val = val + '';
    }
    return val;
  },

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

  keyForPolymorphicId: function(key) {
    return key;
  },

  keyForPolymorphicType: function(key) {
    return key + '_type';
  }
});
