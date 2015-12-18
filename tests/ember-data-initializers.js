;(function() {
  /* globals Ember */
  /* globals DS */
  var K = Ember.K;
  Ember.onLoad('Ember.Application', function(Application) {

    Application.initializer({
      name:       "ember-data",
      initialize: DS._setupContainer
    });

    Application.instanceInitializer({
      name:       "ember-data",
      initialize: DS._initializeStoreService
    });

    // Deprecated initializers to satisfy old code that depended on them
    Application.initializer({
      name:       "store",
      after:      "ember-data",
      initialize: K
    });

    Application.initializer({
      name:       "transforms",
      before:     "store",
      initialize: K
    });

    Application.initializer({
      name:       "data-adapter",
      before:     "store",
      initialize: K
    });

    Application.initializer({
      name:       "injectStore",
      before:     "store",
      initialize: K
    });
  });
})();
