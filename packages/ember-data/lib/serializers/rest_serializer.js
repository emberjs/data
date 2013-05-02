require('ember-data/serializers/json_serializer');

/**
  @module data
  @submodule data-serializers
*/

/**
  @class RESTSerializer
  @constructor
  @namespace DS
  @extends DS.Serializer
*/

var get = Ember.get;

DS.RESTSerializer = DS.JSONSerializer.extend({
  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  keyForBelongsTo: function(type, name) {
    var key = this.keyForAttributeName(type, name);

    if (this.embeddedType(type, name)) {
      return key;
    }

    return key + "_id";
  },

  keyForHasMany: function(type, name) {
    var key = this.keyForAttributeName(type, name);

    if (this.embeddedType(type, name)) {
      return key;
    }

    return this.singularize(key) + "_ids";
  },

  keyForPolymorphicId: function(key) {
    return key;
  },

  keyForPolymorphicType: function(key) {
    return key.replace(/_id$/, '_type');
  },

  extractValidationErrors: function(type, json) {
    var errors = {};

    function addError(name, key) {
      if (json['errors'].hasOwnProperty(key)) {
        errors[name] = json['errors'][key];
      }
    }

    type.eachAttribute(function(name) {
      var key = this._keyForAttributeName(type, name);
      addError(name, key);
    }, this);

    type.eachRelationship(function(name, meta) {
      var key;
      if (meta.kind === 'belongsTo') {
        key = this._keyForBelongsTo(type, name);
      } else if (meta.kind === 'hasMany') {
        key = this._keyForHasMany(type, name);
      }
      addError(name, key);
    }, this);

    return errors;
  }
});
