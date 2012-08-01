/**
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

var app;

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
        ApplicationController: Ember.View.extend()
      });
    });
  },

  teardown: function() {
    app.destroy();
  }
});

test("If a Store property exists on an Ember.Application, it should be instantiated.", function() {
  app.initialize();

  ok(app.get('router.store') instanceof DS.Store, "the store was injected");
});

test("If a store is instantiated, it should be made available to each controller.", function() {
  app.initialize();

  ok(app.get('router.fooController.store') instanceof DS.Store, "the store was injected");
});

