var container, store;
var run = Ember.run;

module("unit/store/serializer_for - DS.Store#serializerFor", {
  setup: function() {
    store = createStore({ person: DS.Model.extend() });
    container = store.container;
  },

  teardown: function() {
    run(function() {
      container.destroy();
      store.destroy();
    });
  }
});

test("Calling serializerFor looks up 'serializer:<type>' from the container", function() {
  var PersonSerializer = DS.JSONSerializer.extend();

  container.register('serializer:person', PersonSerializer);

  ok(store.serializerFor('person') instanceof PersonSerializer, "serializer returned from serializerFor is an instance of the registered Serializer class");
});

test("Calling serializerFor with a type that has not been registered looks up the default ApplicationSerializer", function() {
  var ApplicationSerializer = DS.JSONSerializer.extend();

  container.register('serializer:application', ApplicationSerializer);

  ok(store.serializerFor('person') instanceof ApplicationSerializer, "serializer returned from serializerFor is an instance of ApplicationSerializer");
});

test("Calling serializerFor with a type that has not been registered and in an application that does not have an ApplicationSerializer looks up the default Ember Data serializer", function() {
  ok(store.serializerFor('person') instanceof DS.JSONSerializer, "serializer returned from serializerFor is an instance of DS.JSONSerializer");
});
