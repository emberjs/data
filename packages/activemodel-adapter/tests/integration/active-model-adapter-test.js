var env, store, adapter, SuperUser;
var passedUrl, passedVerb, passedHash;
module("integration/active_model_adapter - AMS Adapter", {
  setup() {
    SuperUser = DS.Model.extend();

    env = setupStore({
      superUser: SuperUser,
      adapter: DS.ActiveModelAdapter
    });

    store = env.store;
    adapter = env.adapter;

    passedUrl = passedVerb = passedHash = null;
  }
});

test('buildURL - decamelizes names', function() {
  equal(adapter.buildURL('superUser', 1), "/super_users/1");
});

test('ajaxError - returns invalid error if 422 response', function() {

  var jqXHR = {
    status: 422,
    responseText: JSON.stringify({ name: "can't be blank" })
  };

  equal(adapter.ajaxError(jqXHR).errors.name, "can't be blank");
});

test('ajaxError - returns ajax response if not 422 response', function() {
  var jqXHR = {
    status: 500,
    responseText: "Something went wrong"
  };

  equal(adapter.ajaxError(jqXHR), jqXHR);
});
