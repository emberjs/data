require('ember-data/serializers/json_serializer');

/**
  @module ember-data
*/

var get = Ember.get;

/**
  @class RESTSerializer
  @namespace DS
  @extends DS.Serializer
*/
DS.RESTSerializer = DS.JSONSerializer.extend({

  /**
    @method keyForAttributeName
    @param type
    @param name
  */
  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  /**
    @method keyForBelongsTo
    @param type
    @param name
  */
  keyForBelongsTo: function(type, name) {
    var key = this.keyForAttributeName(type, name);

    if (this.embeddedType(type, name)) {
      return key;
    }

    return key + "_id";
  },

  /**
    @method keyForHasMany
    @param type
    @param name
  */
  keyForHasMany: function(type, name) {
    var key = this.keyForAttributeName(type, name);

    if (this.embeddedType(type, name)) {
      return key;
    }

    return this.singularize(key) + "_ids";
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
    return key.replace(/_id$/, '_type');
  },

  /**
    @method extractValidationErrors
    @param type
    @param json
  */
  extractValidationErrors: function(type, json) {
    var errors = {};

    get(type, 'attributes').forEach(function(name) {
      var key = this._keyForAttributeName(type, name);
      if (json['errors'].hasOwnProperty(key)) {
        errors[name] = json['errors'][key];
      }
    }, this);

    return errors;
  }
});
