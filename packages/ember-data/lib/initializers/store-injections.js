/**
  Configures a registry with injections on Ember applications
  for the Ember-Data store. Accepts an optional namespace argument.

  @method initializeStoreInjections
  @param {Ember.Registry} registry
*/
export default function initializeStoreInjections(registry) {
  registry.injection('controller', 'store', 'service:store');
  registry.injection('route', 'store', 'service:store');
  registry.injection('data-adapter', 'store', 'service:store');
}
