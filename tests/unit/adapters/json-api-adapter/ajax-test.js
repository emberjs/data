import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let Person, Place, store, adapter, env;
const { run } = Ember;

module("unit/adapters/json-api-adapter/ajax - building requests", {
  beforeEach() {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };
    env = setupStore({ adapter: DS.JSONAPIAdapter, person: Person, place: Place });
    store = env.store;
    adapter = env.adapter;
  },

  afterEach() {
    run(() => {
      store.destroy();
      env.container.destroy();
    });
  }
});

test('ajaxOptions() adds Accept when no other headers exist', function(assert) {
  let url = 'example.com';
  let type = 'GET';
  let ajaxOptions = adapter.ajaxOptions(url, type, {});
  let receivedHeaders = [];
  let fakeXHR = {
    setRequestHeader(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  assert.deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json']], 'headers assigned');
});

test('ajaxOptions() adds Accept header to existing headers', function(assert) {
  adapter.headers = { 'Other-key': 'Other Value' };
  let url = 'example.com';
  let type = 'GET';
  let ajaxOptions = adapter.ajaxOptions(url, type, {});
  let receivedHeaders = [];
  let fakeXHR = {
    setRequestHeader(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  assert.deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json'], ['Other-key', 'Other Value']], 'headers assigned');
});

test('ajaxOptions() adds Accept header to existing computed properties headers', function(assert) {
  adapter.headers = Ember.computed(function() {
    return { 'Other-key': 'Other Value' };
  });
  let url = 'example.com';
  let type = 'GET';
  let ajaxOptions = adapter.ajaxOptions(url, type, {});
  let receivedHeaders = [];
  let fakeXHR = {
    setRequestHeader(key, value) {
      receivedHeaders.push([key, value]);
    }
  };
  ajaxOptions.beforeSend(fakeXHR);
  assert.deepEqual(receivedHeaders, [['Accept', 'application/vnd.api+json'], ['Other-key', 'Other Value']], 'headers assigned');
});
