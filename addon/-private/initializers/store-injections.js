/*
  Configures a registry with injections on Ember applications
  for the Ember-Data store. Accepts an optional namespace argument.

  @method initializeStoreInjections
  @param {Ember.Registry} registry
*/
export default function initializeStoreInjections(registry) {
  // registry.injection for Ember < 2.1.0
  // application.inject for Ember 2.1.0+
  var inject = registry.inject || registry.injection;
  inject.call(registry, 'controller', 'store', 'service:store');
  inject.call(registry, 'route', 'store', 'service:store');
  inject.call(registry, 'data-adapter', 'store', 'service:store');
}
