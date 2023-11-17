import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('unit/adapters/json-api-adapter/ajax-options - building requests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'adapter:application',
      class extends JSONAPIAdapter {
        useFetch = true;
      }
    );
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('ajaxOptions() adds Accept when no other headers exist', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    const url = 'example.com';
    const type = 'GET';
    const ajaxOptions = adapter.ajaxOptions(url, type, {});
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() adds Accept header to existing headers', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    adapter.headers = { 'Other-key': 'Other Value' };

    const url = 'example.com';
    const type = 'GET';
    const ajaxOptions = adapter.ajaxOptions(url, type, {});
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
        'Other-key': 'Other Value',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() adds Accept header to existing computed properties headers', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    adapter.headers = { 'Other-key': 'Other Value' };

    const url = 'example.com';
    const type = 'GET';
    const ajaxOptions = adapter.ajaxOptions(url, type, {});
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
        'Other-key': 'Other Value',
      },
      'headers assigned'
    );
  });

  test('ajaxOptions() does not overwrite passed value of Accept headers', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    adapter.headers = { 'Other-Key': 'Other Value', Accept: 'application/json' };

    const url = 'example.com';
    const type = 'GET';
    const ajaxOptions = adapter.ajaxOptions(url, type, {});
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/json',
        'Other-Key': 'Other Value',
      },
      'headers assigned, Accept header not overwritten'
    );
  });

  test('ajaxOptions() headers are set POST', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    adapter.headers = {};

    const url = 'example.com';
    const type = 'POST';
    const ajaxOptions = adapter.ajaxOptions(url, type, { data: { type: 'post' } });
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        Accept: 'application/vnd.api+json',
        'content-type': 'application/vnd.api+json',
      },
      'headers assigned on POST'
    );
  });

  test('ajaxOptions() does not override with existing headers["Content-Type"] POST', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    adapter.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    const url = 'example.com';
    const type = 'POST';
    const ajaxOptions = adapter.ajaxOptions(url, type, { data: { type: 'post' } });
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/vnd.api+json',
      },
      'content-type header not overwritten'
    );
  });

  test('ajaxOptions() can override with options.contentType POST', function (assert) {
    const adapter = this.owner.lookup('adapter:application');

    adapter.headers = {};

    const url = 'example.com';
    const type = 'POST';
    const ajaxOptions = adapter.ajaxOptions(url, type, {
      contentType: 'application/x-www-form-urlencoded',
      data: { type: 'post' },
    });
    const receivedHeaders = ajaxOptions.headers;

    assert.deepEqual(
      receivedHeaders,
      {
        'content-type': 'application/x-www-form-urlencoded',
        Accept: 'application/vnd.api+json',
      },
      'content-type header overwritten'
    );
  });
});
