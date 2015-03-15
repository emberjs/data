var run = Ember.run;
var Container = Ember.Container;
var Store = DS.Store;
var EmberObject = Ember.Object;
var setupContainer = DS._setupContainer;

var container;

/*
  These tests ensure that Ember Data works with Ember.js' container
  initialization and dependency injection API.
*/

module("integration/setup-container - Setting up a container", {
  setup: function() {
    container = new Container();
    setupContainer(container);
  },

  teardown: function() {
    run(container, container.destroy);
  }
});

test("The store should be registered into a container.", function() {
  ok(container.lookup('store:main') instanceof Store, "the custom store is instantiated");
});

test("The store should be registered into the container as a service.", function() {
  ok(container.lookup('service:store') instanceof Store, "the store as a service is registered");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  container.register('controller:foo', EmberObject.extend({}));
  var fooController = container.lookup('controller:foo');
  ok(fooController.get('store') instanceof Store, "the store was injected");
});

test("the deprecated serializer:_default is resolved as serializer:default", function() {
  var deprecated;
  var valid = container.lookup('serializer:-default');
  expectDeprecation(function() {
    deprecated = container.lookup('serializer:_default');
  });

  ok(deprecated === valid, "they should resolve to the same thing");
});

test("the deprecated serializer:_rest is resolved as serializer:rest", function() {
  var deprecated;
  var valid = container.lookup('serializer:-rest');
  expectDeprecation(function() {
    deprecated = container.lookup('serializer:_rest');
  });

  ok(deprecated === valid, "they should resolve to the same thing");
});

test("the deprecated adapter:_rest is resolved as adapter:rest", function() {
  var deprecated;
  var valid = container.lookup('adapter:-rest');
  expectDeprecation(function() {
    deprecated = container.lookup('adapter:_rest');
  });

  ok(deprecated === valid, "they should resolve to the same thing");
});

test("a deprecation is made when looking up adapter:_rest", function() {
  expectDeprecation(function() {
    container.lookup('serializer:_default');
  }, "You tried to look up 'serializer:_default', but this has been deprecated in favor of 'serializer:-default'.");
});
