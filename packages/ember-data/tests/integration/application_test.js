var app, container;

/**
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

module("integration/application - Injecting a Custom Store", {
  setup: function() {
    Ember.run(function() {
      app = Ember.Application.create({
        Store: DS.Store.extend({ isCustom: true }),
        FooController: Ember.Controller.extend(),
        ApplicationView: Ember.View.extend(),
        BazController: {},
        ApplicationController: Ember.View.extend()
      });
    });

    container = app.__container__;
  },

  teardown: function() {
    app.destroy();
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  ok(container.lookup('store:main').get('isCustom'), "the custom store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  var fooController = container.lookup('controller:foo');
  ok(fooController.get('store.isCustom'), "the custom store was injected");
});

module("integration/application - Injecting the Default Store", {
  setup: function() {
    Ember.run(function() {
      app = Ember.Application.create({
        FooController: Ember.Controller.extend(),
        ApplicationView: Ember.View.extend(),
        BazController: {},
        ApplicationController: Ember.View.extend()
      });
    });

    container = app.__container__;
  },

  teardown: function() {
    app.destroy();
    Ember.BOOTED = false;
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  ok(container.lookup('store:main') instanceof DS.Store, "the store was instantiated");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  var fooController = container.lookup('controller:foo');
  ok(fooController.get('store') instanceof DS.Store, "the store was injected");
});

test("the DS namespace should be accessible", function() {
  ok(Ember.Namespace.byName('DS') instanceof Ember.Namespace, "the DS namespace is accessible");
});

test("the deprecated serializer:_default is resolved as serializer:default", function(){
  var deprecated, valid = container.lookup('serializer:-default');
  expectDeprecation(function() {
    deprecated = container.lookup('serializer:_default');
  });

  ok(deprecated === valid, "they should resolve to the same thing");
});

test("the deprecated serializer:_rest is resolved as serializer:rest", function(){
  var deprecated, valid = container.lookup('serializer:-rest');
  expectDeprecation(function() {
    deprecated = container.lookup('serializer:_rest');
  });

  ok(deprecated === valid, "they should resolve to the same thing");
});

test("the deprecated adapter:_rest is resolved as adapter:rest", function(){
  var deprecated, valid = container.lookup('adapter:-rest');
  expectDeprecation(function() {
    deprecated = container.lookup('adapter:_rest');
  });

  ok(deprecated === valid, "they should resolve to the same thing");
});

test("a deprecation is made when looking up adapter:_rest", function(){
  expectDeprecation(function(){
    container.lookup('serializer:_default');
  },"You tried to look up 'serializer:_default', but this has been deprecated in favor of 'serializer:-default'.");
});
