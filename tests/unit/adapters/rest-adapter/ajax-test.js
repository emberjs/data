import { resolve, Promise as EmberPromise } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';
import { isEnabled } from 'ember-data/-private';

var Person, Place, store, adapter, env;

module('unit/adapters/rest-adapter/ajax - building requests', {
  beforeEach() {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };
    env = setupStore({ adapter: DS.RESTAdapter, person: Person, place: Place });
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

test('When an id is searched, the correct url should be generated', function(assert) {
  assert.expect(2);

  let count = 0;

  if (isEnabled('ds-improved-ajax')) {
    adapter._makeRequest = function(request) {
      if (count === 0) { assert.equal(request.url, '/people/1', 'should create the correct url'); }
      if (count === 1) { assert.equal(request.url, '/places/1', 'should create the correct url'); }
      count++;
      return resolve();
    };
  } else {
    adapter.ajax = function(url, method) {
      if (count === 0) { assert.equal(url, '/people/1', 'should create the correct url'); }
      if (count === 1) { assert.equal(url, '/places/1', 'should create the correct url'); }
      count++;
      return resolve();
    };
  }

  return run(() => {
    return EmberPromise.all([
      adapter.findRecord(store, Person, 1, {}),
      adapter.findRecord(store, Place, 1, {})
    ]);
  });
});

test(`id's should be sanatized`, function(assert) {
  assert.expect(1);

  if (isEnabled('ds-improved-ajax')) {
    adapter._makeRequest = function(request) {
      assert.equal(request.url, '/people/..%2Fplace%2F1', `should create the correct url`);
      return resolve();
    };
  } else {
    adapter.ajax = function(url, method) {
      assert.equal(url, '/people/..%2Fplace%2F1', "should create the correct url");
      return resolve();
    };
  }

  return run(() => adapter.findRecord(store, Person, '../place/1', {}));
});

test('ajaxOptions() headers are set', function(assert) {
  adapter.headers = {
    'Content-Type': 'application/json',
    'Other-key': 'Other Value'
  };

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
  assert.deepEqual(receivedHeaders, [
    ['Content-Type', 'application/json'],
    ['Other-key', 'Other Value']
  ], 'headers assigned');
});

test('ajaxOptions() do not serializes data when GET', function(assert) {
  let url = 'example.com';
  let type = 'GET';
  let ajaxOptions = adapter.ajaxOptions(url, type, { data: { key: 'value' } });

  assert.deepEqual(ajaxOptions, {
    context: adapter,
    data: {
      key: 'value'
    },
    dataType: 'json',
    type: 'GET',
    url: 'example.com'
  });
});

test('ajaxOptions() serializes data when not GET', function(assert) {
  let url = 'example.com';
  let type = 'POST';
  let ajaxOptions = adapter.ajaxOptions(url, type, { data: { key: 'value' } });

  assert.deepEqual(ajaxOptions, {
    contentType: 'application/json; charset=utf-8',
    context: adapter,
    data: '{"key":"value"}',
    dataType: 'json',
    type: 'POST',
    url: 'example.com'
  });
});

test('ajaxOptions() empty data', function(assert) {
  let url = 'example.com';
  let type = 'POST';
  let ajaxOptions = adapter.ajaxOptions(url, type, {});

  assert.deepEqual(ajaxOptions, {
    context: adapter,
    dataType: 'json',
    type: 'POST',
    url: 'example.com'
  });
});
