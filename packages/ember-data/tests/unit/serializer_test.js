var serializer;

module("DS.Serializer", {
  setup: function() {
    serializer = DS.Serializer.create();
  },

  teardown: function() {
    serializer.destroy();
  }
});

