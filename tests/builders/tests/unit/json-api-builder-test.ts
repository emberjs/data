import { module, skip, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { createRecord, deleteRecord, findRecord, query, updateRecord } from '@ember-data/json-api/request';
import { setBuildURLConfig } from '@ember-data/request-utils';
import Store from '@ember-data/store';

import { headersToObject } from '../helpers/utils';

const JSON_API_HEADERS = { accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json' };

module('JSON:API | Request Builders', function (hooks) {
  setupTest(hooks);

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
        url: 'https://api.example.com/api/v1/user-settings/1',
        method: 'GET',
        headers: new Headers(JSON_API_HEADERS),
        cacheOptions: {},
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with an identifier`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  test('findRecord by type+id', function (assert) {
    const result = findRecord('user-setting', '1');
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings/1',
        method: 'GET',
        headers: new Headers(JSON_API_HEADERS),
        cacheOptions: {},
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with type+id`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  test('findRecord by identifier with options', function (assert) {
    const result = findRecord(
      { type: 'user-setting', id: '1' },
      { reload: true, backgroundReload: false, include: 'user,friends' }
    );
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings/1?include=friends%2Cuser',
        method: 'GET',
        headers: new Headers(JSON_API_HEADERS),
        cacheOptions: {
          reload: true,
          backgroundReload: false,
        },
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with an identifier and options`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  test('findRecord by type+id with options', function (assert) {
    const result = findRecord('user-setting', '1', { reload: true, backgroundReload: false, include: 'user,friends' });
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings/1?include=friends%2Cuser',
        method: 'GET',
        headers: new Headers(JSON_API_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with type+id and options`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
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
        url: 'https://api.example.com/api/v1/user-settings?include=friends%2Cuser&search=beta%2Czeta&sort=name%3Aasc',
        method: 'GET',
        headers: new Headers(JSON_API_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'query',
      },
      `query works with type and options`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  test('createRecord with identifier', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const record = { type: 'user-setting' };
    const userSettingIdentifier = store.identifierCache.getOrCreateRecordIdentifier(record);

    console.log({ userSettingIdentifier });
    // TODO: This still fails: `is not a record instantiated by @ember-data/store`
    const result = createRecord(userSettingIdentifier);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings',
        method: 'POST',
        headers: new Headers(JSON_API_HEADERS),
        op: 'createRecord',
        data: {
          record,
        },
      },
      `createRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  // Do we need this?
  skip('createRecord with store record object', function (assert) {});

  skip('updateRecord with identifier', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const record = { type: 'user-setting' };
    const userSettingIdentifier = store.identifierCache.getOrCreateRecordIdentifier(record);

    const result = updateRecord(userSettingIdentifier);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings',
        method: 'PUT',
        headers: new Headers(JSON_API_HEADERS),
        op: 'updateRecord',
        data: {
          record,
        },
      },
      `updateRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  skip('updateRecord with PATCH method', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const record = { type: 'user-setting' };
    const userSettingIdentifier = store.identifierCache.getOrCreateRecordIdentifier(record);

    const result = updateRecord(userSettingIdentifier, { patch: true });

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings',
        method: 'PATCH',
        headers: new Headers(JSON_API_HEADERS),
        op: 'updateRecord',
        data: {
          record,
        },
      },
      `updateRecord works with patch option`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });

  skip('deleteRecord with identifier', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const record = { type: 'user-setting' };
    const userSettingIdentifier = store.identifierCache.getOrCreateRecordIdentifier(record);

    const result = deleteRecord(userSettingIdentifier);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings',
        method: 'DELETE',
        headers: new Headers(JSON_API_HEADERS),
        op: 'deleteRecord',
        data: {
          record,
        },
      },
      `deleteRecord works with patch option`
    );
    assert.deepEqual(headersToObject(result.headers), JSON_API_HEADERS);
  });
});
