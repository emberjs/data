import initializeStore from './initializers/store';
import initializeTransforms from './initializers/transforms';
import initializeStoreInjections from './initializers/store_injections';
import initializeDataAdapter from './initializers/data_adapter';
import setupActiveModelContainer from '../../../activemodel-adapter/lib/setup-container';

/**
  @module ember-data

  This code registers an injection for Ember.Application.

  If an Ember.js developer defines a subclass of DS.Store on their application,
  as `App.ApplicationStore` (or via a module system that resolves to `store:application`)
  this code will automatically instantiate it and make it available on the
  router.

  Additionally, after an application's controllers have been injected, they will
  each have the store made available to them.

  For example, imagine an Ember.js application with the following classes:

  App.ApplicationStore = DS.Store.extend({
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

export default function setupContainer(container, application){
  // application is not a required argument. This ensures
  // testing setups can setup a container without booting an
  // entire ember application.

  initializeDataAdapter(container, application);
  initializeTransforms(container, application);
  initializeStoreInjections(container, application);
  initializeStore(container, application);
  setupActiveModelContainer(container, application);
};
