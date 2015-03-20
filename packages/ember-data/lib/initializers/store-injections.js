/**
  Configures a container with injections on Ember applications
  for the Ember-Data store. Accepts an optional namespace argument.

  @method initializeStoreInjections
  @param {Ember.Container} container
*/
export default function initializeStoreInjections(container) {
  container.injection('controller', 'store', 'store:main');
  container.injection('route', 'store', 'store:main');
  container.injection('serializer', 'store', 'store:main');
  container.injection('data-adapter', 'store', 'store:main');
}
