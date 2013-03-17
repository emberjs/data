var set = Ember.set;

/**
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
  if (Application.registerInjection) {
    Application.registerInjection({
      name: "store",
      before: "controllers",

      // If a store subclass is defined, like App.Store,
      // instantiate it and inject it into the router.
      injection: function(app, stateManager, property) {
        if (!stateManager) { return; }
        if (property === 'Store') {
          set(stateManager, 'store', app[property].create());
        }
      }
    });

    Application.registerInjection({
      name: "giveStoreToControllers",
      after: ['store','controllers'],

      // For each controller, set its `store` property
      // to the DS.Store instance we created above.
      injection: function(app, stateManager, property) {
        if (!stateManager) { return; }
        if (/^[A-Z].*Controller$/.test(property)) {
          var controllerName = property.charAt(0).toLowerCase() + property.substr(1);
          var store = stateManager.get('store');
          var controller = stateManager.get(controllerName);
          if(!controller) { return; }

          controller.set('store', store);
        }
      }
    });
  } else if (Application.initializer) {
    Application.initializer({
      name: "store",

      initialize: function(container, application) {
        application.register('store:main', application.Store);

        // Eagerly generate the store so defaultStore is populated.
        // TODO: Do this in a finisher hook
        container.lookup('store:main');
      }
    });

    Application.initializer({
      name: "injectStore",

      initialize: function(container, application) {
        application.inject('controller', 'store', 'store:main');
        application.inject('route', 'store', 'store:main');
      }
    });
  }
});
