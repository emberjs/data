module("Per-type Serializers", {
  setup: function() {

  },

  teardown: function() {

  }
});

test("Serializers can be specified per-type on the store", function() {
  expect(1);

  var Store = DS.Store.extend();
  var Post = DS.Model.extend();
  var customSerializer = DS.Serializer.create();

  Store.registerSerializer(Post, customSerializer);

  var store = Store.create({
    adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        var serializer = this.serializerForType(store, type);
        strictEqual(serializer, customSerializer, "custom serializer is returned");
      }
    })
  });

  store.find(Post, 1);
});
