import {JSONSerializer, RESTSerializer} from "ember-data/serializers";
import {RESTAdapter} from "ember-data/adapters";
import ContainerProxy from "ember-data/system/container_proxy";
import Store from "ember-data/system/store";

/**
  Configures a container for use with an Ember-Data
  store. Accepts an optional namespace argument.

  @method initializeStore
  @param {Ember.Container} container
  @param {Object} [application] an application namespace
*/
export default function initializeStore(container, application) {
  Ember.deprecate('Specifying a custom Store for Ember Data on your global namespace as `App.Store` ' +
                  'has been deprecated. Please use `App.ApplicationStore` instead.', !(application && application.Store));

  container.register('store:main', container.lookupFactory('store:application') || (application && application.Store) || Store);

  // allow older names to be looked up

  var proxy = new ContainerProxy(container);
  proxy.registerDeprecations([
    { deprecated: 'serializer:_default',  valid: 'serializer:-default' },
    { deprecated: 'serializer:_rest',     valid: 'serializer:-rest' },
    { deprecated: 'adapter:_rest',        valid: 'adapter:-rest' }
  ]);

  // new go forward paths
  container.register('serializer:-default', JSONSerializer);
  container.register('serializer:-rest', RESTSerializer);
  container.register('adapter:-rest', RESTAdapter);

  // Eagerly generate the store so defaultStore is populated.
  // TODO: Do this in a finisher hook
  var store = container.lookup('store:main');
  container.register('service:store', store, { instantiate: false });
}
