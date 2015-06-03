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
    container = registry.container();
  }
  // Eagerly generate the store so defaultStore is populated.
  var store = container.lookup('store:application');
  registry.register('service:store', store, { instantiate: false });
}
