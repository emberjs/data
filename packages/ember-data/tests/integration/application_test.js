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

  test("After App.reset(), App.MyModel.find(...) still works", function () {
    app.Person = DS.Model.extend({ name: DS.attr('string') });
    app.Person.find('1');
    Ember.run(function () { app.reset(); });
    app.Person.find('2');
    ok(true, "did not crash");
  });

  test("After App.reset(), there is a new, valid defaultStore", function () {
    var oldStore = DS.get("defaultStore");
    ok(oldStore instanceof DS.Store, "defaultStore is present before reset");
    Ember.run(function () { app.reset(); });
    var newStore = DS.get("defaultStore");
    ok(newStore instanceof DS.Store, "defaultStore is present after reset");
    ok(newStore !== oldStore, "defaultStore has changed");
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

  test("After App.reset(), App.MyModel.find(...) still works", function () {
    app.Person = DS.Model.extend({ name: DS.attr('string') });
    Ember.run(function () { app.initialize(); });
    app.Person.find('1');
    Ember.run(function () { app.reset(); });
    app.Person.find('2');
    ok(true, "did not crash");
  });

  test("After App.reset(), there is a new, valid defaultStore", function () {
    Ember.run(function () { app.initialize(); });
    var oldStore = DS.get("defaultStore");
    ok(oldStore instanceof DS.Store, "defaultStore is present before reset");
    Ember.run(function () { app.reset(); });
    var newStore = DS.get("defaultStore");
    ok(newStore instanceof DS.Store, "defaultStore is present after reset");
    ok(newStore !== oldStore, "defaultStore has changed");
  });
}

if (!Ember.Application.registerInjection && !Ember.Application.initializer) {
  test("Should support either the old or new initialization API", function() {
    ok(false, "Should not get here");
  });
}
