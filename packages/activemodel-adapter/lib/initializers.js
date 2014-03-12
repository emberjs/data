import ContainerProxy from "../../ember-data/lib/system/container_proxy";
import ActiveModelSerializer from "./system/active_model_serializer";
import ActiveModelAdapter from "./system/active_model_adapter";

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: "activeModelAdapter",

    initialize: function(container, application) {
      var proxy = new ContainerProxy(container);
      proxy.registerDeprecations([
        {deprecated: 'serializer:_ams',  valid: 'serializer:-active-model'},
        {deprecated: 'adapter:_ams',     valid: 'adapter:-active-model'}
      ]);

      application.register('serializer:-active-model', ActiveModelSerializer);
      application.register('adapter:-active-model', ActiveModelAdapter);
    }
  });
});
