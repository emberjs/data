;(function() {

  // Since store.pushMany is used pretty heavily inside the tests, fixing all
  // the deprecation warnings at once would be a big changeset. That's why the
  // log level for this deprecation is set to LOG, so the deprecations are
  // logged but they do not result in a failed test.
  Ember.Debug._addDeprecationLevel("ember-data-pushMany", Ember.Debug._deprecationLevels.LOG);

  Ember.Debug._addDeprecationLevel("ember-data-shouldBackgroundReloadRecord", Ember.Debug._deprecationLevels.LOG);
  Ember.Debug._addDeprecationLevel("ember-data-shouldReloadAll", Ember.Debug._deprecationLevels.LOG);

  Ember.RSVP.configure('onerror', function(reason) {
    // only print error messages if they're exceptions;
    // otherwise, let a future turn of the event loop
    // handle the error.
    if (reason && reason instanceof Error) {
      Ember.Logger.log(reason, reason.stack);
      throw reason;
    }
  });

  var transforms = {
    'boolean': DS.BooleanTransform.create(),
    'date': DS.DateTransform.create(),
    'number': DS.NumberTransform.create(),
    'string': DS.StringTransform.create()
  };

  // Prevent all tests involving serialization to require a container
  DS.JSONSerializer.reopen({
    transformFor: function(attributeType) {
      return this._super(attributeType, true) || transforms[attributeType];
    }
  });

})();
