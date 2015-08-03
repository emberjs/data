/**
 Configures a registry for use with an Ember-Data
 store.

 @method initializeStore
 @param {Ember.ApplicationInstance} applicationOrRegistry
 */
export default function initializeStoreService(application) {
  var container = application.container;
  // Eagerly generate the store so defaultStore is populated.
  container.lookup('service:store');
}
