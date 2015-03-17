import DebugAdapter from "ember-data/system/debug/debug-adapter";

/**
  Configures a container with injections on Ember applications
  for the Ember-Data store. Accepts an optional namespace argument.

  @method initializeStoreInjections
  @param {Ember.Container} container
*/
export default function initializeDebugAdapter(container) {
  container.register('data-adapter:main', DebugAdapter);
}
