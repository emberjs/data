var get = Ember.get, set = Ember.set;

var serializer;

module("DS.NullSerializer", {
  setup: function() {
    serializer = DS.NullSerializer.create();

    serializer.registerTransform('unobtainium', {
      serialize: function(value) {
        return 'serialize';
      },

      deserialize: function(value) {
        return 'deserialize';
      }
    });
  },

  teardown: function() {
    serializer.destroy();
  }
});

test("ignores transforms", function() {
  var value;

  value = serializer.deserializeValue('unknown', 'unobtainium');
  equal(value, 'unknown', "the deserialize transform was not called");

  value = serializer.serializeValue('unknown', 'unobtainium');
  equal(value, 'unknown', "the serialize transform was not called");
});
