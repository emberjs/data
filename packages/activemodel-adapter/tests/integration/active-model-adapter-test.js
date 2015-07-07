var env, store, adapter, SuperUser;
var passedUrl, passedVerb, passedHash;
module("integration/active_model_adapter - AMS Adapter", {
  setup: function() {
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

test('handleResponse - returns invalid error if 422 response', function() {

  var jqXHR = {
    status: 422,
    responseText: JSON.stringify({ errors: { name: "can't be blank" } })
  };

  var json = adapter.parseErrorResponse(jqXHR.responseText);

  var error = adapter.handleResponse(jqXHR.status, {}, json).errors[0];

  equal(error.detail, "can't be blank");
  equal(error.source.pointer, "data/attributes/name");
});

test('handleResponse - returns ajax response if not 422 response', function() {
  var jqXHR = {
    status: 500,
    responseText: "Something went wrong"
  };

  var json = adapter.parseErrorResponse(jqXHR.responseText);

  ok(adapter.handleResponse(jqXHR.status, {}, json) instanceof DS.AdapterError, 'must be a DS.AdapterError');
});
