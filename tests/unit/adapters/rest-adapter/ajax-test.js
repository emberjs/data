import Ember from 'ember';

import DS from 'ember-data';

var Person, Place, store, adapter, env;
var run = Ember.run;

module("unit/adapters/rest-adapter/ajax - building requests", {
  setup: function() {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };
    env = setupStore({ adapter: DS.RESTAdapter, person: Person, place: Place });
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

test("When an id is searched, the correct url should be generated", function() {
  expect(2);
  var count = 0;
  adapter.ajax = function(url, method) {
    if (count === 0) { equal(url, '/people/1', "should create the correct url"); }
    if (count === 1) { equal(url, '/places/1', "should create the correct url"); }
    count++;
    return Ember.RSVP.resolve();
  };
  run(function() {
    adapter.findRecord(store, Person, 1);
    adapter.findRecord(store, Place, 1);
  });
});

test("id's should be sanatized", function() {
  expect(1);
  adapter.ajax = function(url, method) {
    equal(url, '/people/..%2Fplace%2F1', "should create the correct url");
    return Ember.RSVP.resolve();
  };
  run(function() {
    adapter.findRecord(store, Person, '../place/1');
  });
});

test("ajaxOptions() headers are set", function() {
  adapter.headers = { 'Content-Type': 'application/json', 'Other-key': 'Other Value' };
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
  deepEqual(receivedHeaders, [['Content-Type', 'application/json'], ['Other-key', 'Other Value']], 'headers assigned');
});

test("ajaxOptions() do not serializes data when GET", function() {
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, { data: { key: 'value' } });

  deepEqual(ajaxOptions, {
    context: adapter,
    data: {
      key: 'value'
    },
    dataType: 'json',
    type: 'GET',
    url: 'example.com'
  });
});

test("ajaxOptions() serializes data when not GET", function() {
  var url = 'example.com';
  var type = 'POST';
  var ajaxOptions = adapter.ajaxOptions(url, type, { data: { key: 'value' } });

  deepEqual(ajaxOptions, {
    contentType: "application/json; charset=utf-8",
    context: adapter,
    data: '{"key":"value"}',
    dataType: 'json',
    type: 'POST',
    url: 'example.com'
  });
});

test("ajaxOptions() empty data", function() {
  var url = 'example.com';
  var type = 'POST';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});

  deepEqual(ajaxOptions, {
    context: adapter,
    dataType: 'json',
    type: 'POST',
    url: 'example.com'
  });
});
