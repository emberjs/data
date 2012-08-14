var app;

module("Application boot", {
  setup: function() {
    var Router = Ember.Router.extend({
      root: Ember.Route.extend()
    });

    app = Ember.Application.create({
      Router: Router,
      Store: DS.Store,
      FooController: Ember.Controller.extend(),
      ApplicationView: Ember.Object.extend({
        appendTo: Ember.K
      }),
      barController: function(name, controller) {
      },
      ApplicationController: Ember.Object
    });
  },

  teardown: function() {
    app.destroy();
  }
});


test("It injects the controllers into the router", function() {
  app.initialize();

  ok(app.get('router.fooController') instanceof Ember.Controller, "the controller was injected");
});

test("It only injects capitalized controllers into the router", function() {
  app.initialize();

  equal(app.get('router.barController'), undefined, "the function was not injected");
});

test("It injects the store into the router", function() {
  app.initialize();

  ok(app.get('router.store') instanceof DS.Store, "the store was injected");
});

test("It injects the store into controllers", function() {
  app.initialize();

  ok(app.get('router.fooController.store') instanceof DS.Store, "the store was injected");
});
