import { DebugAdapter } from './-private';
import Store from '@ember-data/store';

/*
 Configures a registry for use with an Ember-Data
 store. Accepts an optional namespace argument.

 @method initializeStore
 @param {Ember.Registry} registry
 */
function initializeStore(application) {
  application.registerOptionsForType('serializer', { singleton: false });
  application.registerOptionsForType('adapter', { singleton: false });

  if (!application.hasRegistration('service:store')) {
    application.register('service:store', Store);
  }
}

/*
 Configures a registry with injections on Ember applications
 for the Ember-Data store. Accepts an optional namespace argument.

 @method initializeDebugAdapter
 @param {Ember.Registry} registry
 */
function initializeDataAdapter(registry) {
  registry.register('data-adapter:main', DebugAdapter);
}

/*
 Configures a registry with injections on Ember applications
 for the Ember-Data store. Accepts an optional namespace argument.

 @method initializeStoreInjections
 @param {Ember.Registry} registry
 */
function initializeStoreInjections(registry) {
  // registry.injection for Ember < 2.1.0
  // application.inject for Ember 2.1.0+
  let inject = registry.inject || registry.injection;
  inject.call(registry, 'controller', 'store', 'service:store');
  inject.call(registry, 'route', 'store', 'service:store');
  inject.call(registry, 'data-adapter', 'store', 'service:store');
}

export default function setupContainer(application) {
  initializeDataAdapter(application);
  initializeStoreInjections(application);
  initializeStore(application);
}
