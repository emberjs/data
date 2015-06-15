import Store from "ember-data/system/store";
import ContainerProxy from "ember-data/system/container-proxy";

/**
 Configures a registry for use with an Ember-Data
 store.

 @method initializeStore
 @param {Ember.ApplicationInstance} applicationOrRegistry
 */
export default function initializeStoreService(applicationOrRegistry) {
  var registry, container;
  if (applicationOrRegistry.registry && applicationOrRegistry.container) {
    // initializeStoreService was registered with an
    // instanceInitializer. The first argument is the application
    // instance.
    registry = applicationOrRegistry.registry;
    container = applicationOrRegistry.container;
  } else {
    // initializeStoreService was called by an initializer instead of
    // an instanceInitializer. The first argument is a registy. This
    // case allows ED to support Ember pre 1.12
    registry = applicationOrRegistry;
    if (registry.container) { // Support Ember 1.10 - 1.11
      container = registry.container();
    } else { // Support Ember 1.9
      container = registry;
    }
  }

  var store;

  // If there is a store registered as a service, skip generation
  if (registry.has('service:store')) {
    return;
  }

  // Eagerly generate the store so defaultStore is populated.
  if (registry.has('store:main')) {
    Ember.deprecate('Registering a custom store as `store:main` or defining a store in app/store.js has been deprecated. Please move you store to `service:store` or define your custom store in `app/services/store.js`');
    store = container.lookup('store:main');
  } else {
    var storeMainProxy = new ContainerProxy(registry);
    storeMainProxy.registerDeprecations([
      { deprecated: 'store:main', valid: 'service:store' }
    ]);
  }

  if (registry.has('store:application')) {
    Ember.deprecate('Registering a custom store as `store:application` or defining a store in app/stores/application.js has been deprecated. Please move you store to `service:store` or define your custom store in `app/services/store.js`');
    store = container.lookup('store:application');
  } else {
    var storeApplicationProxy = new ContainerProxy(registry);
    storeApplicationProxy.registerDeprecations([
      { deprecated: 'store:application', valid: 'service:store' }
    ]);
  }

  if (store) {
    registry.register('service:store', store, { instantiate: false });
  } else {
    registry.register('service:store', Store);
  }
}
