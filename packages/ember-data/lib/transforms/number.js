var empty = Ember.isEmpty;

DS.NumberTransform = DS.Transform.extend({

  deserialize: function(serialized) {
    return empty(serialized) ? null : Number(serialized);
  },

  serialize: function(deserialized) {
    return empty(deserialized) ? null : Number(deserialized);
  }
});