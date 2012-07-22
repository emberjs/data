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
      ApplicationController: Ember.Object
    });
  },

  teardown: function() {
    app.destroy();
  }
});

test("It injects the store into the router", function() {
  app.initialize();

  ok(app.get('router.store') instanceof DS.Store, "the store was injected");
});

test("It injects the store into controllers", function() {
  app.initialize();

  ok(app.get('router.fooController.store') instanceof DS.Store, "the store was injected");
});
