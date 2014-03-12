import Store from "./system/store";
import {JSONSerializer, RESTSerializer} from "./serializers";
import {RESTAdapter} from "./adapters";
import DebugAdapter from "./system/debug/debug_adapter";
import ContainerProxy from "./system/container_proxy";
import {
  BooleanTransform,
  DateTransform,
  StringTransform,
  NumberTransform
} from "./transforms";

/**
  @module ember-data
*/

var set = Ember.set;

/*
  This code registers an injection for Ember.Application.

  If an Ember.js developer defines a subclass of DS.Store on their application,
  this code will automatically instantiate it and make it available on the
  router.

  Additionally, after an application's controllers have been injected, they will
  each have the store made available to them.

  For example, imagine an Ember.js application with the following classes:

  App.Store = DS.Store.extend({
    adapter: 'custom'
  });

  App.PostsController = Ember.ArrayController.extend({
    // ...
  });

  When the application is initialized, `App.Store` will automatically be
  instantiated, and the instance of `App.PostsController` will have its `store`
  property set to that instance.

  Note that this code will only be run if the `ember-application` package is
  loaded. If Ember Data is being used in an environment other than a
  typical application (e.g., node.js where only `ember-runtime` is available),
  this code will be ignored.
*/

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: "store",

    initialize: function(container, application) {
      application.register('store:main', application.Store || Store);

      // allow older names to be looked up

      var proxy = new ContainerProxy(container);
      proxy.registerDeprecations([
        {deprecated: 'serializer:_default',  valid: 'serializer:-default'},
        {deprecated: 'serializer:_rest',     valid: 'serializer:-rest'},
        {deprecated: 'adapter:_rest',        valid: 'adapter:-rest'}
      ]);

      // new go forward paths
      application.register('serializer:-default', JSONSerializer);
      application.register('serializer:-rest', RESTSerializer);
      application.register('adapter:-rest', RESTAdapter);

      // Eagerly generate the store so defaultStore is populated.
      // TODO: Do this in a finisher hook
      container.lookup('store:main');
    }
  });

  Application.initializer({
    name: "transforms",
    before: "store",

    initialize: function(container, application) {
      application.register('transform:boolean', BooleanTransform);
      application.register('transform:date', DateTransform);
      application.register('transform:number', NumberTransform);
      application.register('transform:string', StringTransform);
    }
  });

  Application.initializer({
    name: "data-adapter",
    before: "store",

    initialize: function(container, application) {
      application.register('data-adapter:main', DebugAdapter);
    }
  });

  Application.initializer({
    name: "injectStore",
    before: "store",

    initialize: function(container, application) {
      application.inject('controller', 'store', 'store:main');
      application.inject('route', 'store', 'store:main');
      application.inject('serializer', 'store', 'store:main');
      application.inject('data-adapter', 'store', 'store:main');
    }
  });

});
