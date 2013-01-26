require('ember-data/system/serializer');

var get = Ember.get, set = Ember.set;

DS.PassThroughSerializer = DS.Serializer.extend({
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

  extractMany: function(loader, objects, type, records) {
    var references = [];

    for (var i = 0; i < objects.length; i++) {
      var reference = this.extractRecordRepresentation(loader, type, objects[i]);
      references.push(reference);
    }

    loader.populateArray(references);
  },

  extract: function(loader, object, type, record) {
    this.extractRecordRepresentation(loader, type, object);
  },

  extractAttribute: function(type, hash, attributeName) {
    return hash[attributeName];
  },

  createSerializedForm: function() {
    return {};
  },

  addId: function(data, key, id) {
    data[key] = id;
  },

  addAttribute: function(hash, key, value) {
    hash[key] = value;
  },

  deserializeValue: function(value, attributeType) {
    return value;
  },

  serializeValue: function(value, attributeType) {
    return value;
  }
});
