import { module, test } from 'qunit';

import { findRecord, query } from '@ember-data/active-record/request';
import { setBuildURLConfig } from '@ember-data/request-utils';

import { headersToObject } from '../helpers/utils';

const ACTIVE_RECORD_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

module('ActiveRecord | Request Builders', function (hooks) {
  hooks.beforeEach(function () {
    setBuildURLConfig({ host: 'https://api.example.com', namespace: 'api/v1' });
  });

  hooks.afterEach(function () {
    setBuildURLConfig({ host: '', namespace: '' });
  });

  test('findRecord by identifier', function (assert) {
    const result = findRecord({ type: 'user-setting', id: '1' });
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings/1',
        method: 'GET',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        cacheOptions: {},
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with an identifier`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS);
  });

  test('findRecord by type+id', function (assert) {
    const result = findRecord('user-setting', '1');
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings/1',
        method: 'GET',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        cacheOptions: {},
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with type+id`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS);
  });

  test('findRecord by identifier with options', function (assert) {
    const result = findRecord(
      { type: 'user-setting', id: '1' },
      { reload: true, backgroundReload: false, include: 'user,friends' }
    );
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings/1?include=friends%2Cuser',
        method: 'GET',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        cacheOptions: {
          reload: true,
          backgroundReload: false,
        },
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with an identifier and options`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS);
  });

  test('findRecord by type+id with options', function (assert) {
    const result = findRecord('user-setting', '1', { reload: true, backgroundReload: false, include: 'user,friends' });
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings/1?include=friends%2Cuser',
        method: 'GET',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with type+id and options`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS);
  });

  test('query', function (assert) {
    const result = query(
      'user-setting',
      { include: 'user,friends', sort: 'name:asc', search: ['zeta', 'beta'] },
      { reload: true, backgroundReload: false }
    );
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings?include=friends%2Cuser&search=beta%2Czeta&sort=name%3Aasc',
        method: 'GET',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'query',
      },
      `query works with type and options`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS);
  });
});
