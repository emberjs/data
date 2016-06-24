import DebugAdapter from "ember-data/-private/system/debug/debug-adapter";

/*
  Configures a registry with injections on Ember applications
  for the Ember-Data store. Accepts an optional namespace argument.

  @method initializeDebugAdapter
  @param {Ember.Registry} registry
*/
export default function initializeDebugAdapter(registry) {
  registry.register('data-adapter:main', DebugAdapter);
}
