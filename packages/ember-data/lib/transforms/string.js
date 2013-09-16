var none = Ember.isNone;

DS.StringTransform = DS.Transform.extend({

  deserialize: function(serialized) {
    return none(serialized) ? null : String(serialized);
  },

  serialize: function(deserialized) {
    return none(deserialized) ? null : String(deserialized);
  }

});
