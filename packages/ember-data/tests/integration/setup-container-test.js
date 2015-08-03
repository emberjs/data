var run = Ember.run;
var Container = Ember.Container;
var Registry = Ember.Registry;
var Store = DS.Store;
var EmberObject = Ember.Object;
var setupContainer = DS._setupContainer;

var container, registry;

/*
  These tests ensure that Ember Data works with Ember.js' container
  initialization and dependency injection API.
*/

module("integration/setup-container - Setting up a container", {
  setup: function() {
    if (Registry) {
      registry = new Registry();
      container = registry.container();
    } else {
      container = new Container();
      registry = container;
    }
    setupContainer(registry);
  },

  teardown: function() {
    run(container, container.destroy);
  }
});

test("The store should be registered into a container.", function() {
  ok(container.lookup('service:store') instanceof Store, "the custom store is instantiated");
});

test("The store should be registered into the container as a service.", function() {
  ok(container.lookup('service:store') instanceof Store, "the store as a service is registered");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  registry.register('controller:foo', EmberObject.extend({}));
  var fooController = container.lookup('controller:foo');
  ok(fooController.get('store') instanceof Store, "the store was injected");
});

test("serializers are not returned as singletons - each lookup should return a different instance", function() {
  var serializer1, serializer2;
  serializer1 = container.lookup('serializer:-rest');
  serializer2 = container.lookup('serializer:-rest');
  notEqual(serializer1, serializer2);
});

test("adapters are not returned as singletons - each lookup should return a different instance", function() {
  var adapter1, adapter2;
  adapter1 = container.lookup('adapter:-rest');
  adapter2 = container.lookup('adapter:-rest');
  notEqual(adapter1, adapter2);
});
