import type { TestContext } from '@ember/test-helpers';

import { createRecord, deleteRecord, findRecord, query, updateRecord } from '@ember-data/active-record/request';
import { setBuildURLConfig } from '@ember-data/request-utils';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

import type UserSetting from '../../app/models/user-setting';
import { headersToObject } from '../helpers/utils';

const ACTIVE_RECORD_HEADERS = { accept: 'application/json;charset=utf-8' };

module('ActiveRecord | Request Builders', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    setBuildURLConfig({ host: 'https://api.example.com', namespace: 'api/v1' });
  });

  hooks.afterEach(function () {
    setBuildURLConfig({ host: '', namespace: '' });
  });

  test('findRecord by identifier', function (this: TestContext, assert) {
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

  test('findRecord by type+id', function (this: TestContext, assert) {
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

  test('findRecord by identifier with options', function (this: TestContext, assert) {
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

  test('findRecord by type+id with options', function (this: TestContext, assert) {
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

  test('query', function (this: TestContext, assert) {
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

  test('query with empty params [used to be findAll]', function (this: TestContext, assert) {
    const result = query('user-setting', {}, { reload: true, backgroundReload: false });
    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings',
        method: 'GET',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        cacheOptions: { reload: true, backgroundReload: false },
        op: 'query',
      },
      `query works with type and empty options, does not leave a trailing ?`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS);
  });

  test('createRecord passing store record', function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;
    const userSetting = store.createRecord('user-setting', {
      name: 'test',
    });
    const identifier = recordIdentifierFor(userSetting);
    const result = createRecord(userSetting);

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user_settings',
        method: 'POST',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        op: 'createRecord',
        data: {
          record: identifier,
        },
      },
      `createRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS, "headers are set to ActiveRecord API's");
  });

  test('createRecord passing store record and options', function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;
    const userSetting = store.createRecord('user-setting', {
      name: 'test',
    });
    const identifier = recordIdentifierFor(userSetting);
    const result = createRecord(userSetting, { resourcePath: 'user-settings/new' });

    assert.deepEqual(
      result,
      {
        url: 'https://api.example.com/api/v1/user-settings/new',
        method: 'POST',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        op: 'createRecord',
        data: {
          record: identifier,
        },
      },
      `createRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS, "headers are set to ActiveRecord API's");
  });

  test('updateRecord passing store record', function (this: TestContext, assert) {
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
        url: 'https://api.example.com/api/v1/user_settings/12',
        method: 'PUT',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        op: 'updateRecord',
        data: {
          record: identifier,
        },
      },
      `updateRecord works with record identifier passed`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS, "headers are set to ActiveRecord API's");
  });

  test('updateRecord with PATCH method', function (this: TestContext, assert) {
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
        url: 'https://api.example.com/api/v1/user_settings/12',
        method: 'PATCH',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        op: 'updateRecord',
        data: {
          record: identifier,
        },
      },
      `updateRecord works with patch option`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS, "headers are set to ActiveRecord API's");
  });

  test('deleteRecord with identifier', function (this: TestContext, assert) {
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
        url: 'https://api.example.com/api/v1/user_settings/12',
        method: 'DELETE',
        headers: new Headers(ACTIVE_RECORD_HEADERS),
        op: 'deleteRecord',
        data: {
          record: identifier,
        },
      },
      `deleteRecord works with patch option`
    );
    assert.deepEqual(headersToObject(result.headers), ACTIVE_RECORD_HEADERS, "headers are set to ActiveRecord API's");
  });
});
