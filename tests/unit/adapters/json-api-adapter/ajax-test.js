import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Person, Place, store, adapter, env;
var run = Ember.run;

module("unit/adapters/json-api-adapter/ajax - building requests", {
  beforeEach() {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };
    env = setupStore({ adapter: DS.JSONAPIAdapter, person: Person, place: Place });
    store = env.store;
    adapter = env.adapter;
  },

  afterEach() {
    run(function() {
      store.destroy();
      env.container.destroy();
    });
  }
});

test("ajaxOptions() adds Accept when no other headers exist", function(assert) {
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});
  var receivedHeaders = [];
  var fakeXHR = {
    setRequestHeader(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  assert.deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json']], 'headers assigned');
});

test("ajaxOptions() adds Accept header to existing headers", function(assert) {
  adapter.headers = { 'Other-key': 'Other Value' };
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});
  var receivedHeaders = [];
  var fakeXHR = {
    setRequestHeader(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  assert.deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json'], ['Other-key', 'Other Value']], 'headers assigned');
});

test("ajaxOptions() adds Accept header to existing computed properties headers", function(assert) {
  adapter.headers = Ember.computed(function() {
    return { 'Other-key': 'Other Value' };
  });
  var url = 'example.com';
  var type = 'GET';
  var ajaxOptions = adapter.ajaxOptions(url, type, {});
  var receivedHeaders = [];
  var fakeXHR = {
    setRequestHeader(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  assert.deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json'], ['Other-key', 'Other Value']], 'headers assigned');
});
