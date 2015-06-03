var env, store, adapter, User;
var originalAjax;

module("integration/active_model_adapter_serializer - AMS Adapter and Serializer", {
  setup() {
    originalAjax = Ember.$.ajax;

    User = DS.Model.extend({
      firstName: DS.attr()
    });

    env = setupStore({
      user: User,
      adapter: DS.ActiveModelAdapter
    });

    store = env.store;
    adapter = env.adapter;

    env.registry.register('serializer:application', DS.ActiveModelSerializer);
  },

  teardown() {
    Ember.$.ajax = originalAjax;
  }
});

test('errors are camelCased and are expected under the `errors` property of the payload', function() {
  var jqXHR = {
    status: 422,
    responseText: JSON.stringify({
      errors: {
        first_name: ["firstName error"]
      }
    })
  };

  Ember.$.ajax = function(hash) {
    hash.error(jqXHR);
  };

  var user;
  Ember.run(function() {
    user = store.push('user', { id: 1 });
  });

  Ember.run(function() {
    user.save().then(null, function() {
      var errors = user.get('errors');
      ok(errors.has('firstName'), "there are errors for the firstName attribute");
      deepEqual(errors.errorsFor('firstName').getEach('message'), ['firstName error']);
    });
  });
});
