var run = Ember.run;
var env, store, adapter, serializer;

module("integration/adapter/serialize - DS.Adapter integration test", {
  setup: function() {
    var Person = DS.Model.extend({
      name: DS.attr('string')
    });

    env = setupStore({ person: Person });
    store = env.store;
    adapter = env.adapter;
    serializer = store.serializerFor('person');
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("serialize() is delegated to the serializer", function() {
  expect(1);

  serializer.serialize = function(snapshot, options) {
    deepEqual(options, { foo: 'bar' });
  };

  run(function() {
    var person = store.createRecord('person');
    adapter.serialize(person._createSnapshot(), { foo: 'bar' });
  });
});
