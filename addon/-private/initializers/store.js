import Store from "ember-data/-private/system/store";
import { JSONAPISerializer, JSONSerializer, RESTSerializer } from "ember-data/-private/serializers";
import { JSONAPIAdapter, RESTAdapter } from "ember-data/-private/adapters";

function has(applicationOrRegistry, fullName) {
  if (applicationOrRegistry.has) {
    // < 2.1.0
    return applicationOrRegistry.has(fullName);
  } else {
    // 2.1.0+
    return applicationOrRegistry.hasRegistration(fullName);
  }
}

/*
  Configures a registry for use with an Ember-Data
  store. Accepts an optional namespace argument.

  @method initializeStore
  @param {Ember.Registry} registry
*/
export default function initializeStore(registry) {
  // registry.optionsForType for Ember < 2.1.0
  // application.registerOptionsForType for Ember 2.1.0+
  var registerOptionsForType = registry.registerOptionsForType || registry.optionsForType;
  registerOptionsForType.call(registry, 'serializer', { singleton: false });
  registerOptionsForType.call(registry, 'adapter', { singleton: false });

  registry.register('serializer:-default', JSONSerializer);
  registry.register('serializer:-rest', RESTSerializer);
  registry.register('adapter:-rest', RESTAdapter);

  registry.register('adapter:-json-api', JSONAPIAdapter);
  registry.register('serializer:-json-api', JSONAPISerializer);


  if (!has(registry, 'service:store')) {
    registry.register('service:store', Store);
  }
}
