import { DebugAdapter } from './-private';
import Store from '@ember-data/store';
import JSONAPIAdapter from '@ember-data/adapter/json-api';

function hasRegistration(application, registrationName) {
  // fallback our ember-data tests necessary
  // until we kill-off createStore/setupStore
  // or @ember/test-helpers kills off it's
  // legacy support that calls our initializer with registry
  // instead of application
  if (!application.hasRegistration) {
    return application.has(registrationName);
  }
  return application.hasRegistration(registrationName);
}
/*
 Configures a registry for use with an Ember-Data
 store. Accepts an optional namespace argument.

 @method initializeStore
 @param {Ember.Registry} registry
 */
function initializeStore(application) {
  let registerOptionsForType = application.registerOptionsForType || application.optionsForType;
  registerOptionsForType.call(application, 'serializer', { singleton: false });
  registerOptionsForType.call(application, 'adapter', { singleton: false });

  application.register('adapter:-json-api', JSONAPIAdapter);

  if (!hasRegistration(application, 'service:store')) {
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
