import Ember from 'ember';
import setupContainer from 'ember-data/setup-container';
import initializeStoreService from 'ember-data/instance-initializers/initialize-store-service';


var K = Ember.K;

/**
  @module ember-data
*/

/*

  This code initializes Ember-Data onto an Ember application.

  If an Ember.js developer defines a subclass of DS.Store on their application,
  as `App.StoreService` (or via a module system that resolves to `service:store`)
  this code will automatically instantiate it and make it available on the
  router.

  Additionally, after an application's controllers have been injected, they will
  each have the store made available to them.

  For example, imagine an Ember.js application with the following classes:

  App.StoreService = DS.Store.extend({
    adapter: 'custom'
  });

  App.PostsController = Ember.ArrayController.extend({
    // ...
  });

  When the application is initialized, `App.ApplicationStore` will automatically be
  instantiated, and the instance of `App.PostsController` will have its `store`
  property set to that instance.

  Note that this code will only be run if the `ember-application` package is
  loaded. If Ember Data is being used in an environment other than a
  typical application (e.g., node.js where only `ember-runtime` is available),
  this code will be ignored.
*/

Ember.onLoad('Ember.Application', function(Application) {

  Application.initializer({
    name:       "ember-data",
    initialize: setupContainer
  });

  Application.instanceInitializer({
    name:       "ember-data",
    initialize: initializeStoreService
  });

  // Deprecated initializers to satisfy old code that depended on them
  Application.initializer({
    name:       "store",
    after:      "ember-data",
    initialize: K
  });

  Application.initializer({
    name:       "transforms",
    before:     "store",
    initialize: K
  });

  Application.initializer({
    name:       "data-adapter",
    before:     "store",
    initialize: K
  });

  Application.initializer({
    name:       "injectStore",
    before:     "store",
    initialize: K
  });
});
