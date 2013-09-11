Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: "activeModelAdapter",

    initialize: function(container, application) {
      application.register('serializer:_ams', DS.ActiveModelSerializer);
      application.register('adapter:_ams', DS.ActiveModelAdapter);
    }
  });
});
