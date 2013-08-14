require("ember-data/serializers/new_json_serializer");
require("ember-data/system/debug/debug_adapter");
/**
  @module ember-data
*/

var set = Ember.set;

/*
  This code registers an injection for Ember.Application.

  If an Ember.js developer defines a subclass of DS.Store on their application,
  this code will automatically instantiate it and make it available on the
  router.

  Additionally, after an application's controllers have been injected, they will
  each have the store made available to them.

  For example, imagine an Ember.js application with the following classes:

  App.Store = DS.Store.extend({
    adapter: 'App.MyCustomAdapter'
  });

  App.PostsController = Ember.ArrayController.extend({
    // ...
  });

  When the application is initialized, `App.Store` will automatically be
  instantiated, and the instance of `App.PostsController` will have its `store`
  property set to that instance.

  Note that this code will only be run if the `ember-application` package is
  loaded. If Ember Data is being used in an environment other than a
  typical application (e.g., node.js where only `ember-runtime` is available),
  this code will be ignored.
*/

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: "store",

    initialize: function(container, application) {
      Ember.assert("You included Ember Data but didn't define "+application.toString()+".Store", application.Store);

      application.register('store:main', application.Store);
      application.register('serializer:_default', DS.NewJSONSerializer);

      // Eagerly generate the store so defaultStore is populated.
      // TODO: Do this in a finisher hook
      container.lookup('store:main');
    }
  });

  // Keep ED compatible with previous versions of ember
  // TODO: Remove the if statement for Ember 1.0
  if (DS.DebugAdapter) {
    Application.initializer({
      name: "dataAdapter",

      initialize: function(container, application) {
        application.register('dataAdapter:main', DS.DebugAdapter);
      }
    });
  }

  Application.initializer({
    name: "injectStore",

    initialize: function(container, application) {
      application.inject('controller', 'store', 'store:main');
      application.inject('route', 'store', 'store:main');
      application.inject('dataAdapter', 'store', 'store:main');
    }
  });

});
