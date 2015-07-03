import Store from "ember-data/system/store";
import { JSONAPISerializer, JSONSerializer, RESTSerializer } from "ember-data/serializers";
import { JSONAPIAdapter, RESTAdapter } from "ember-data/adapters";

/**
  Configures a registry for use with an Ember-Data
  store. Accepts an optional namespace argument.

  @method initializeStore
  @param {Ember.Registry} registry
  @param {Object} [application] an application namespace
*/
export default function initializeStore(registry, application) {
  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  registry.register('serializer:-default', JSONSerializer);
  registry.register('serializer:-rest', RESTSerializer);
  registry.register('adapter:-rest', RESTAdapter);

  registry.register('adapter:-json-api', JSONAPIAdapter);
  registry.register('serializer:-json-api', JSONAPISerializer);


  if (!registry.has('service:store')) {
    registry.register('service:store', Store);
  }
}
