/*
  Configures a registry for use with an Ember-Data
  store.

  @method initializeStoreService
  @param {Ember.ApplicationInstance | Ember.EngineInstance} instance
*/
export default function initializeStoreService(instance) {
  // instance.lookup supports Ember 2.1 and higher
  // instance.container supports Ember 1.11 - 2.0
  const container = instance.lookup ? instance : instance.container;

  // Eagerly generate the store so defaultStore is populated.
  container.lookup('service:store');
}
