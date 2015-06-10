var env;
var run = Ember.run;

module('integration/serializers/json-api-serializer - JSONAPISerializer', {
  setup: function() {
    env = setupStore({
    });
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

/*test('...', function() {

});*/
