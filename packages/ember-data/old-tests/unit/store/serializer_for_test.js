var container, store, app;

module("DS.Store - serializerFor - unit/store/serializer_for_test", {
  setup: function() {
    container = new Ember.Container();

    store = DS.Store.create({
      container: container
    });
  },

  teardown: function() {
    container.destroy();
    store.destroy();

    if (app) { app.destroy(); }
  }
});

test("Calling serializerFor looks up 'serializer:<type>' from the container", function() {
  var PersonSerializer = DS.Serializer.extend();

  container.register('serializer:person', PersonSerializer);

  ok(store.serializerFor('person') instanceof PersonSerializer, "serializer returned from serializerFor is an instance of the registered Serializer class");
});

test("Calling serializerFor with a type that has not been registered looks up the default ApplicationSerializer", function() {
  var ApplicationSerializer = DS.Serializer.extend();

  container.register('serializer:application', ApplicationSerializer);

  ok(store.serializerFor('person') instanceof ApplicationSerializer, "serializer returned from serializerFor is an instance of ApplicationSerializer");
});

test("Calling serializerFor with a type that has not been registered and in an application that does not have an ApplicationSerializer looks up the default Ember Data serializer", function() {
  Ember.run(function() {
    app = Ember.Application.create();
    app.Store = DS.Store.extend();
    app.advanceReadiness();
  });

  var store = app.__container__.lookup('store:main');

  ok(store.serializerFor('person') instanceof DS.NewJSONSerializer, "serializer returned from serializerFor is an instance of DS.JSONSerializer");
});
