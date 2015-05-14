import {JSONSerializer, RESTSerializer} from "ember-data/serializers";
import {RESTAdapter} from "ember-data/adapters";
import ContainerProxy from "ember-data/system/container-proxy";
import Store from "ember-data/system/store";

/**
  Configures a registry for use with an Ember-Data
  store. Accepts an optional namespace argument.

  @method initializeStore
  @param {Ember.Registry} registry
  @param {Object} [application] an application namespace
*/
export default function initializeStore(paramOne, paramTwo) {
  // initializerStore be called by an Ember.initializer
  // when used with ember 1.11.0 or below.
  var params = getRegistryAndContainer(paramOne, paramTwo);
  var application = params.application;
  var registry = params.registry;
  var container = params.container;

  Ember.deprecate('Specifying a custom Store for Ember Data on your global namespace as `App.Store` ' +
                  'has been deprecated. Please use `App.ApplicationStore` instead.', !(application && application.Store));

  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  // Change to `application.register` once we drop support for Ember pre 1.12
  registry.register('store:main', container.lookupFactory('store:application') || (application && application.Store) || Store);

  // allow older names to be looked up

  var proxy = new ContainerProxy(registry);
  proxy.registerDeprecations([
    { deprecated: 'serializer:_default',  valid: 'serializer:-default' },
    { deprecated: 'serializer:_rest',     valid: 'serializer:-rest' },
    { deprecated: 'adapter:_rest',        valid: 'adapter:-rest' }
  ]);

  // new go forward paths
  registry.register('serializer:-default', JSONSerializer);
  registry.register('serializer:-rest', RESTSerializer);
  registry.register('adapter:-rest', RESTAdapter);

  // Eagerly generate the store so defaultStore is populated.
  // TODO: Do this in a finisher hook
  var store = container.lookup('store:main');
  registry.register('service:store', store, { instantiate: false });
}

function getRegistryAndContainer(registry, application) {
  // Ember 1.12.0 the first argument is the application
  // There is no second argument
  if (registry.registry && registry.container) {
    application = registry;
    return {
      application: application,
      registry: application.registry,
      container: application.container
    };
  } else {
    // Ember 1.11.0 or below
    return {
      application: application,
      registry: registry,
      container: registry
    };
  }
}
