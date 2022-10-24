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
    let adapter = this.owner.lookup('adapter:application');

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

  test('ajaxOptions() adds Accept header to existing headers', function (assert) {
    let adapter = this.owner.lookup('adapter:application');

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

  test('ajaxOptions() adds Accept header to existing computed properties headers', function (assert) {
    let adapter = this.owner.lookup('adapter:application');

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

  test('ajaxOptions() does not overwrite passed value of Accept headers', function (assert) {
    let adapter = this.owner.lookup('adapter:application');

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

  test('ajaxOptions() headers are set POST', function (assert) {
    let adapter = this.owner.lookup('adapter:application');

    adapter.headers = {};

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, { data: { type: 'post' } });
    let receivedHeaders = ajaxOptions.headers;

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
    let adapter = this.owner.lookup('adapter:application');

    adapter.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, { data: { type: 'post' } });
    let receivedHeaders = ajaxOptions.headers;

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
    let adapter = this.owner.lookup('adapter:application');

    adapter.headers = {};

    let url = 'example.com';
    let type = 'POST';
    let ajaxOptions = adapter.ajaxOptions(url, type, {
      contentType: 'application/x-www-form-urlencoded',
      data: { type: 'post' },
    });
    let receivedHeaders = ajaxOptions.headers;

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
