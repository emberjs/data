import DS from 'ember-data';

var Person, Place, store, adapter, env;
var run = Ember.run;

module("unit/adapters/json-api-adapter/ajax - building requests", {
  setup: function() {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };
    env = setupStore({ adapter: DS.JSONAPIAdapter, person: Person, place: Place });
    store = env.store;
    adapter = env.adapter;
  },

  teardown: function() {
    run(function() {
      store.destroy();
      env.container.destroy();
    });
  }
});

test("ajaxOptions() adds Accept when no other headers exist", function() {
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});
  var receivedHeaders = [];
  var fakeXHR = {
    setRequestHeader: function(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json']], 'headers assigned');
});

test("ajaxOptions() adds Accept header to existing headers", function() {
  adapter.headers = { 'Other-key': 'Other Value' };
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});
  var receivedHeaders = [];
  var fakeXHR = {
    setRequestHeader: function(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json'], ['Other-key', 'Other Value']], 'headers assigned');
});

test("ajaxOptions() adds Accept header to existing computed properties headers", function() {
  adapter.headers = Ember.computed(function() {
    return { 'Other-key': 'Other Value' };
  });
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});
  var receivedHeaders = [];
  var fakeXHR = {
    setRequestHeader: function(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json'], ['Other-key', 'Other Value']], 'headers assigned');
});
