var app, container;

/**
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

if (Ember.Application.initializer) {

  module("Ember.Application Extensions", {
    setup: function() {
      Ember.run(function() {
        app = Ember.Application.create({
          router: false,
          Store: DS.Store,
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
}

if (Ember.Application.registerInjection) {
  /**
    These tests ensure that Ember Data works with Ember.js' application
    initialization and dependency injection APIs.
  */

  module("Ember.Application Extensions", {
    setup: function() {
      var Router = Ember.Router.extend({
        root: Ember.Route.extend()
      });

      Ember.run(function() {
        app = Ember.Application.create({
          Router: Router,
          Store: DS.Store,
          FooController: Ember.Controller.extend(),
          ApplicationView: Ember.View.extend(),
          BazController: {},
          ApplicationController: Ember.View.extend()
        });
      });
    },

    teardown: function() {
      app.destroy();
    }
  });

  test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
    Ember.run(function() { app.initialize(); });

    ok(app.get('router.store') instanceof DS.Store, "the store was injected");
  });

  test("If a store is instantiated, it should be made available to each controller.", function() {
    Ember.run(function() { app.initialize(); });

    ok(app.get('router.fooController.store') instanceof DS.Store, "the store was injected");
  });

  test("It doesn't try to inject the store into non-controllers", function() {
    Ember.run(function() { app.initialize(); });

    equal(app.get('router.bazController.store'), undefined, "the function was not injected");
  });
}

if (!Ember.Application.registerInjection && !Ember.Application.initializer) {
  test("Should support either the old or new initialization API", function() {
    ok(false, "Should not get here");
  });
}
