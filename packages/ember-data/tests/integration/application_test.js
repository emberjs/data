var app, container;

/**
  These tests ensure that Ember Data works with Ember.js' application
  initialization and dependency injection APIs.
*/

module("integration/application - Ember.Application Extensions", {
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

