import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { Promise as EmberPromise, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import RESTSerializer from '@ember-data/serializer/rest';

let Person, Place;

module('unit/adapters/rest-adapter/ajax-options - building requests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    Person = { modelName: 'person' };
    Place = { modelName: 'place' };

    this.owner.register('model:person', Person);
    this.owner.register('model:place', Place);

    this.owner.register(
      'adapter:application',
      class extends RESTAdapter {
        useFetch = true;
      }
    );
    this.owner.register('serializer:application', RESTSerializer.extend());
  });

  test('When an id is searched, the correct url should be generated', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let count = 0;

    adapter.ajax = function (url, method) {
      if (count === 0) {
        assert.strictEqual(url, '/people/1', 'should create the correct url');
      }
      if (count === 1) {
        assert.strictEqual(url, '/places/1', 'should create the correct url');
      }
      count++;
      return resolve();
    };

    return run(() => {
      return EmberPromise.all([adapter.findRecord(store, Person, 1, {}), adapter.findRecord(store, Place, 1, {})]);
    });
  });

  test(`id's should be sanatized`, function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.ajax = function (url, method) {
      assert.strictEqual(url, '/people/..%2Fplace%2F1', 'should create the correct url');
      return resolve();
    };

    return run(() => adapter.findRecord(store, Person, '../place/1', {}));
  });

  test('ajaxOptions() headers are set', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.headers = {
      'Content-Type': 'application/json',
      'Other-key': 'Other Value',
    };

    let url = 'example.com';
    let type = 'GET';
    let ajaxOptions = adapter.ajaxOptions(url, type, {});
    let receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        'Content-Type': 'application/json',
        'Other-key': 'Other Value',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() do not serializes data when GET', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let url = 'example.com';
    let type = 'GET';
    let ajaxOptions = adapter.ajaxOptions(url, type, { data: { key: 'value' } });

    assert.deepEqual(ajaxOptions, {
      credentials: 'same-origin',
      data: {
        key: 'value',
      },
      type: 'GET',
      method: 'GET',
      headers: {},
      url: 'example.com?key=value',
    });
  });

  test('ajaxOptions() serializes data when not GET', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, { data: { key: 'value' } });

    assert.deepEqual(ajaxOptions, {
      credentials: 'same-origin',
      data: { key: 'value' },
      body: '{"key":"value"}',
      type: 'POST',
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      url: 'example.com',
    });
  });

  test('ajaxOptions() can provide own headers["Content-Type"]', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: { key: 'value' },
    });

    assert.deepEqual(ajaxOptions, {
      credentials: 'same-origin',
      data: { key: 'value' },
      body: '{"key":"value"}',
      type: 'POST',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      url: 'example.com',
    });
  });

  test('ajaxOptions() can provide own contentType in options', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, {
      contentType: 'application/x-www-form-urlencoded',
      data: { key: 'value' },
    });

    assert.deepEqual(ajaxOptions, {
      contentType: 'application/x-www-form-urlencoded',
      credentials: 'same-origin',
      data: { key: 'value' },
      body: '{"key":"value"}',
      type: 'POST',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      url: 'example.com',
    });
  });

  test('ajaxOptions() empty data', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, {});

    assert.deepEqual(ajaxOptions, {
      credentials: 'same-origin',
      type: 'POST',
      method: 'POST',
      headers: {},
      url: 'example.com',
    });
  });

  test('ajaxOptions() headers take precedence over adapter headers', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    assert.deepEqual(ajaxOptions, {
      credentials: 'same-origin',
      type: 'POST',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      url: 'example.com',
    });
  });

  test('_fetchRequest() returns a promise', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let noop = function () {};

    return run(() => {
      let fetchPlacePromise = adapter._fetchRequest({
        url: '/places/1',
        success: noop,
        error: noop,
      });

      assert.strictEqual(typeof fetchPlacePromise.then, 'function', '_fetchRequest does not return a promise');

      return fetchPlacePromise;
    });
  });

  module('ajax-options - ajax', function (hooks) {
    hooks.beforeEach(function () {
      this.owner.register(
        'adapter:application',
        class extends RESTAdapter {
          useFetch = false;
        }
      );
    });

    test('ajaxOptions() Content-Type is not set with ajax GET', function (assert) {
      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      let url = 'example.com';
      let type = 'GET';
      let ajaxOptions = adapter.ajaxOptions(url, type, {});

      assert.notOk(ajaxOptions.contentType, 'contentType not set with GET');
    });

    test('ajaxOptions() Content-Type is not set with ajax POST no data', function (assert) {
      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      let url = 'example.com';
      let type = 'POST';
      let ajaxOptions = adapter.ajaxOptions(url, type, {});

      assert.notOk(ajaxOptions.contentType, 'contentType not set with POST no data');
    });

    test('ajaxOptions() Content-Type is set with ajax POST with data if not useFetch', function (assert) {
      let store = this.owner.lookup('service:store');
      this.owner.register(
        'adapter:application',
        class extends RESTAdapter {
          useFetch = false;
        }
      );
      let adapter = store.adapterFor('application');

      let url = 'example.com';
      let type = 'POST';
      let ajaxOptions = adapter.ajaxOptions(url, type, { data: { type: 'post' } });

      assert.strictEqual(ajaxOptions.contentType, 'application/json; charset=utf-8', 'contentType is set with POST');
    });

    test('ajaxOptions() Content-Type is set with ajax POST with data if useFetch', function (assert) {
      let store = this.owner.lookup('service:store');
      this.owner.register(
        'adapter:application',
        class extends RESTAdapter {
          useFetch = true;
        }
      );
      let adapter = store.adapterFor('application');

      let url = 'example.com';
      let type = 'POST';
      let ajaxOptions = adapter.ajaxOptions(url, type, { data: { type: 'post' } });

      assert.strictEqual(
        ajaxOptions.headers['content-type'],
        'application/json; charset=utf-8',
        'contentType is set with POST'
      );
    });
  });
});
