var env, store, adapter, User;

var originalAjax;
const {ActiveModelAdapter} = DS;

module("integration/active_model_adapter_serializer - AMS Adapter and Serializer", {
  setup: function() {
    originalAjax = Ember.$.ajax;

    User = DS.Model.extend({
      firstName: DS.attr()
    });

    env = setupStore({
      user: User,
      adapter: ActiveModelAdapter
    });

    store = env.store;
    adapter = env.adapter;

    env.registry.register('serializer:application', DS.ActiveModelSerializer);
  },

  teardown: function() {
    Ember.$.ajax = originalAjax;
  }
});

test('errors are camelCased and are expected under the `errors` property of the payload', function(assert) {
  var jqXHR = {
    status: 422,
    getAllResponseHeaders: function() { return ''; },
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
      assert.ok(errors.has('firstName'), "there are errors for the firstName attribute");
      assert.deepEqual(errors.errorsFor('firstName').getEach('message'), ['firstName error']);
    });
  });
});
