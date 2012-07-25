/**
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

var app;

module("Ember.Application extensions", {
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
        ApplicationController: Ember.View.extend()
      });
    });
  },

  teardown: function() {
    app.destroy();
  }
});

test("it should inject a store instance into the router", function() {
  app.initialize();

  ok(app.getPath('router.store') instanceof DS.Store, "the store was injected");
});

test("it should inject the store into instantiated controllers", function() {
  app.initialize();

  ok(app.getPath('router.fooController.store') instanceof DS.Store, "the store was injected");
});

