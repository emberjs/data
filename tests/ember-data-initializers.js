/* eslint no-extra-semi: "off" */

;(function() {
  /* globals Ember, require */
  var K = Ember.K;
  Ember.onLoad('Ember.Application', function(Application) {

    var DS = require('ember-data').default;

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
