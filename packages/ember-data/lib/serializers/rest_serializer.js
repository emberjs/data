require('ember-data/serializers/json_serializer');

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
  }
});
