require('ember-data/system/serializer');

var get = Ember.get, set = Ember.set;

DS.NullSerializer = DS.JSONSerializer.extend({
  deserializeValue: function(value, attributeType) {
    return value;
  },

  serializeValue: function(value, attributeType) {
    return value;
  }
});
