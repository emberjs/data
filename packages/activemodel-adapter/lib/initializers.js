Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: "activeModelAdapter",

    initialize: function(container, application) {
      application.register('serializer:active-model', DS.ActiveModelSerializer);
      application.register('adapter:active-model', DS.ActiveModelAdapter);
    }
  });
});
