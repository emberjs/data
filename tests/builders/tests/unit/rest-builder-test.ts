import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

import { setBuildURLConfig } from '@ember-data/request-utils';
import { createRecord, deleteRecord, findRecord, query, updateRecord } from '@ember-data/rest/request';
import Store, { recordIdentifierFor } from '@ember-data/store';

import UserSetting from '../../app/models/user-setting';
import { headersToObject } from '../helpers/utils';

const REST_HEADERS = { accept: 'application/json;charset=utf-8' };

module('REST | Request Builders', function (hooks) {
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
        url: 'https://api.example.com/api/v1/userSettings/1',
        method: 'GET',
        headers: new Headers(REST_HEADERS),
        cacheOptions: {},
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with an identifier`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS);
  });

  test('findRecord by type+id', function (assert) {
    const result = findRecord('user-setting', '1');
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/1',
        method: 'GET',
        headers: new Headers(REST_HEADERS),
        cacheOptions: {},
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with type+id`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS);
  });

  test('findRecord by identifier with options', function (assert) {
    const result = findRecord(
      { type: 'user-setting', id: '1' },
      { reload: true, backgroundReload: false, include: 'user,friends' }
    );
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/1?include=friends%2Cuser',
        method: 'GET',
        headers: new Headers(REST_HEADERS),
        cacheOptions: {
          reload: true,
          backgroundReload: false,
        },
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with an identifier and options`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS);
  });

  test('findRecord by type+id with options', function (assert) {
    const result = findRecord('user-setting', '1', { reload: true, backgroundReload: false, include: 'user,friends' });
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/1?include=friends%2Cuser',
        method: 'GET',
        headers: new Headers(REST_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'findRecord',
        records: [{ type: 'user-setting', id: '1' }],
      },
      `findRecord works with type+id and options`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS);
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
        url: 'https://api.example.com/api/v1/userSettings?include=friends%2Cuser&search=beta%2Czeta&sort=name%3Aasc',
        method: 'GET',
        headers: new Headers(REST_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'query',
      },
      `query works with type and options`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS);
  });

  test('createRecord passing store record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const userSetting = store.createRecord('user-setting', {
      name: 'test',
    });
    const identifier = recordIdentifierFor(userSetting);
    const result = createRecord(userSetting);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings',
        method: 'POST',
        headers: new Headers(REST_HEADERS),
        op: 'createRecord',
        data: {
          record: identifier,
        },
      },
      `createRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS, "headers are set to REST API's");
  });

  test('createRecord passing store record and options', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const userSetting = store.createRecord('user-setting', {
      name: 'test',
    });
    const identifier = recordIdentifierFor(userSetting);
    const result = createRecord(userSetting, { resourcePath: 'userSettings/new' });

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/new',
        method: 'POST',
        headers: new Headers(REST_HEADERS),
        op: 'createRecord',
        data: {
          record: identifier,
        },
      },
      `createRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS, "headers are set to REST API's");
  });

  test('updateRecord passing store record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const expectedData = {
      data: {
        id: '12',
        type: 'user-setting',
        attributes: {
          name: 'test',
        },
      },
    };
    store.push(expectedData);

    const userSetting = store.peekRecord('user-setting', '12') as UserSetting;
    const identifier = recordIdentifierFor(userSetting);

    userSetting.name = 'test2';

    const result = updateRecord(userSetting);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/12',
        method: 'PUT',
        headers: new Headers(REST_HEADERS),
        op: 'updateRecord',
        data: {
          record: identifier,
        },
      },
      `updateRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS, "headers are set to REST API's");
  });

  test('updateRecord with PATCH method', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const expectedData = {
      data: {
        id: '12',
        type: 'user-setting',
        attributes: {
          name: 'test',
        },
      },
    };
    store.push(expectedData);

    const userSetting = store.peekRecord('user-setting', '12') as UserSetting;
    const identifier = recordIdentifierFor(userSetting);

    userSetting.name = 'test2';

    const result = updateRecord(userSetting, { patch: true });

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/12',
        method: 'PATCH',
        headers: new Headers(REST_HEADERS),
        op: 'updateRecord',
        data: {
          record: identifier,
        },
      },
      `updateRecord works with patch option`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS, "headers are set to REST API's");
  });

  test('deleteRecord with identifier', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const expectedData = {
      data: {
        id: '12',
        type: 'user-setting',
        attributes: {
          name: 'test',
        },
      },
    };
    store.push(expectedData);

    const userSetting = store.peekRecord('user-setting', '12');
    const identifier = recordIdentifierFor(userSetting);

    const result = deleteRecord(userSetting);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/userSettings/12',
        method: 'DELETE',
        headers: new Headers(REST_HEADERS),
        op: 'deleteRecord',
        data: {
          record: identifier,
        },
      },
      `deleteRecord works with patch option`
    );
    assert.deepEqual(headersToObject(result.headers), REST_HEADERS, "headers are set to REST API's");
  });
});
