import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let Person, Place, store, adapter, env;

module('unit/adapters/json-api-adapter/fetch - building requests', function(hooks) {
  hooks.beforeEach(function() {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };
    env = setupStore({ adapter: DS.JSONAPIAdapter, person: Person, place: Place });
    store = env.store;
    adapter = env.adapter;
    adapter.set('useFetch', true);
  });

  hooks.afterEach(function() {
    run(() => {
      store.destroy();
      env.container.destroy();
    });
  });

  test('ajaxOptions() adds Accept when no other headers exist', function(assert) {
    let url = 'example.com';
    let type = 'GET';
    let ajaxOptions = adapter.ajaxOptions(url, type, {});
    let receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() adds Accept header to existing headers', function(assert) {
    adapter.headers = { 'Other-key': 'Other Value' };
    let url = 'example.com';
    let type = 'GET';
    let ajaxOptions = adapter.ajaxOptions(url, type, {});
    let receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
        'Other-key': 'Other Value',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() adds Accept header to existing computed properties headers', function(assert) {
    adapter.headers = { 'Other-key': 'Other Value' };
    let url = 'example.com';
    let type = 'GET';
    let ajaxOptions = adapter.ajaxOptions(url, type, {});
    let receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
        'Other-key': 'Other Value',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() does not overwrite passed value of Accept headers', function(assert) {
    adapter.headers = { 'Other-Key': 'Other Value', Accept: 'application/json' };
    let url = 'example.com';
    let type = 'GET';
    let ajaxOptions = adapter.ajaxOptions(url, type, {});
    let receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/json',
        'Other-Key': 'Other Value',
      },
      'headers assigned, Accept header not overwritten'
    );
  });
});
