require('ember-data/system/serializer');
require('ember-data/transforms/json_transforms');

var get = Ember.get, set = Ember.set;

DS.JSONSerializer = DS.Serializer.extend({
  init: function() {
    this._super();

    if (!get(this, 'transforms')) {
      this.set('transforms', DS.JSONTransforms);
    }
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

    // Ensure that we coerce IDs to strings so that record
    // IDs remain consistent between application runs; especially
    // if the ID is serialized and later deserialized from the URL,
    // when type information will have been lost.
    return hash[primaryKey]+'';
  },

  extractHasMany: function(type, hash, key) {
    return hash[key];
  },

  extractBelongsTo: function(type, hash, key) {
    return hash[key];
  },

  replaceEmbeddedBelongsTo: function(type, hash, name, id) {
    hash[this._keyForBelongsTo(type, name)] = id;
  },

  replaceEmbeddedHasMany: function(type, hash, name, ids) {
    hash[this._keyForHasMany(type, name)] = ids;
  }
});
