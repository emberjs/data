/**
  Configures a registry with injections on Ember applications
  for the Ember-Data store. Accepts an optional namespace argument.

  @method initializeStoreInjections
  @param {Ember.Registry} registry
*/
export default function initializeStoreInjections(registry) {
  registry.injection('controller', 'store', 'store:application');
  registry.injection('route', 'store', 'store:application');
  registry.injection('data-adapter', 'store', 'store:application');
}
