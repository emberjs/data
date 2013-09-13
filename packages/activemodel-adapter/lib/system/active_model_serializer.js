require('ember-data/serializers/rest_serializer');

/**
  @module ember-data
*/

var get = Ember.get, isNone = Ember.isNone;

DS.ActiveModelSerializer = DS.RESTSerializer.extend({
  keyForAttribute: function(attr) {
    return Ember.String.decamelize(attr);
  },

  keyForRelationship: function(key, kind) {
    key = Ember.String.decamelize(key);
    if (kind === "belongsTo") {
      return key + "_id";
    } else if (kind === "hasMany") {
      return Ember.String.singularize(key) + "_ids";
    } else {
      return key;
    }
  },

  serializeHasMany: Ember.K,

  serializeIntoHash: function(data, type, record, options) {
    var root = this.rootForType(type.typeKey);
    data[root] = this.serialize(record, options);
  },

  rootForType: function(type) {
    return Ember.String.decamelize(type);
  },

  typeForRoot: function(root) {
    var camelized = Ember.String.camelize(root);
    return Ember.String.singularize(camelized);
  },

  serializePolymorphicType: function(record, json, relationship) {
    var key = relationship.key,
        belongsTo = get(record, key);
    key = this.keyForAttribute(key);
    json[key + "_type"] = Ember.String.capitalize(belongsTo.constructor.typeKey);
  }
});

