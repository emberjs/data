require("ember-data/system/container_proxy");

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: "activeModelAdapter",

    initialize: function(container, application) {
      var proxy = new DS.ContainerProxy(container);
      proxy.registerDeprecations([
        {deprecated: 'serializer:_ams',  valid: 'serializer:-active-model'},
        {deprecated: 'adapter:_ams',     valid: 'adapter:-active-model'}
      ]);

      application.register('serializer:-active-model', DS.ActiveModelSerializer);
      application.register('adapter:-active-model', DS.ActiveModelAdapter);
    }
  });
});
