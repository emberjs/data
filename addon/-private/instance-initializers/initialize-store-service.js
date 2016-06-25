/*
 Configures a registry for use with an Ember-Data
 store.

 @method initializeStoreService
 @param {Ember.ApplicationInstance} applicationOrRegistry
 */
export default function initializeStoreService(application) {
  var container = application.lookup ? application : application.container;
  // Eagerly generate the store so defaultStore is populated.
  container.lookup('service:store');
}
