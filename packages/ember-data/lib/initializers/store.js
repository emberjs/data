import Store from "ember-data/system/store";
import { JSONAPISerializer, JSONSerializer, RESTSerializer } from "ember-data/serializers";
import { JSONAPIAdapter, RESTAdapter } from "ember-data/adapters";
import ContainerProxy from "ember-data/system/container-proxy";

/**
  Configures a registry for use with an Ember-Data
  store. Accepts an optional namespace argument.

  @method initializeStore
  @param {Ember.Registry} registry
  @param {Object} [application] an application namespace
*/
export default function initializeStore(registry, application) {
  Ember.deprecate('Specifying a custom Store for Ember Data on your global namespace as `App.Store` ' +
                  'has been deprecated. Please use `App.ApplicationStore` instead.', !(application && application.Store),
                   { id: 'ds.initializer.specifying-custom-store-on-global-namespace-deprecated', until: '2.0.0' });

  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });

  // allow older names to be looked up
  var proxy = new ContainerProxy(registry);
  proxy.registerDeprecations([
    { deprecated: 'serializer:_default',  valid: 'serializer:-default' },
    { deprecated: 'serializer:_rest',     valid: 'serializer:-rest' },
    { deprecated: 'adapter:_rest',        valid: 'adapter:-rest' }
  ]);

  // new go forward paths
  registry.register('serializer:-default', JSONSerializer.extend({ isNewSerializerAPI: true }));
  registry.register('serializer:-rest', RESTSerializer.extend({ isNewSerializerAPI: true }));
  registry.register('adapter:-rest', RESTAdapter);

  registry.register('adapter:-json-api', JSONAPIAdapter);
  registry.register('serializer:-json-api', JSONAPISerializer);


  var store;
  if (registry.has('store:main')) {
    Ember.deprecate('Registering a custom store as `store:main` or defining a store in app/store.js has been deprecated. Please move you store to `service:store` or define your custom store in `app/services/store.js`', false, {
      id: 'ds.initializer.custom-store-as-store-main-deprecated',
      until: '2.0.0'
    });
    store = registry.lookup('store:main');
  } else {
    var storeMainProxy = new ContainerProxy(registry);
    storeMainProxy.registerDeprecations([
      { deprecated: 'store:main', valid: 'service:store' }
    ]);
  }

  if (registry.has('store:application')) {
    Ember.deprecate('Registering a custom store as `store:main` or defining a store in app/store.js has been deprecated. Please move you store to `service:store` or define your custom store in `app/services/store.js`', false, {
      id: 'ds.initializer.custom-store-as-store-main-deprecated',
      until: '2.0.0'
    });
    store = registry.lookup('store:application');
  } else {
    var storeApplicationProxy = new ContainerProxy(registry);
    storeApplicationProxy.registerDeprecations([
      { deprecated: 'store:application', valid: 'service:store' }
    ]);
  }

  if (store) {
    registry.register('service:store', store, { instantiate: false });
  } else if (!registry.has('service:store')) {
    registry.register('service:store', application && application.Store || Store);
  }
}
