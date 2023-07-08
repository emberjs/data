import { module, test } from 'qunit';

import { buildBaseURL, setBuildURLConfig } from '@ember-data/request-utils';

module('Unit | buildBaseURL', function (hooks) {
  hooks.afterEach(function () {
    setBuildURLConfig({ host: '', namespace: '' });
  });

  test('simple cases (no optional options and no global config)', function (assert) {
    assert.strictEqual(
      buildBaseURL({
        op: 'findRecord',
        identifier: { type: 'user', id: '1' },
      }),
      '/user/1',
      `buildBaseURL works for findRecord`
    );
    assert.strictEqual(
      buildBaseURL({
        op: 'updateRecord',
        identifier: { type: 'user', id: '1' },
      }),
      '/user/1',
      `buildBaseURL works for updateRecord`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'deleteRecord',
        identifier: { type: 'user', id: '1' },
      }),
      '/user/1',
      `buildBaseURL works for deleteRecord`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        fieldPath: 'bestFriend',
      }),
      '/user/1/bestFriend',
      `buildBaseURL works for findRelatedResource`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedCollection',
        identifier: { type: 'user', id: '1' },
        fieldPath: 'friends',
      }),
      '/user/1/friends',
      `buildBaseURL works for findRelatedCollection`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'query',
        identifier: { type: 'user' },
      }),
      '/user',
      `buildBaseURL works for query`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'findMany',
        identifiers: [
          { type: 'user', id: '1' },
          { type: 'user', id: '2' },
        ],
      }),
      '/user',
      `buildBaseURL works for findMany`
    );
  });

  test('resourcePath (no global config)', function (assert) {
    assert.strictEqual(
      buildBaseURL({
        op: 'findRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
      }),
      '/people/1',
      `buildBaseURL works for findRecord`
    );
    assert.strictEqual(
      buildBaseURL({
        op: 'updateRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
      }),
      '/people/1',
      `buildBaseURL works for updateRecord`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'deleteRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
      }),
      '/people/1',
      `buildBaseURL works for deleteRecord`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
      }),
      '/people/1/bestFriend',
      `buildBaseURL works for findRelatedResource`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedCollection',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'friends',
      }),
      '/people/1/friends',
      `buildBaseURL works for findRelatedCollection`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'query',
        identifier: { type: 'user' },
        resourcePath: 'people',
      }),
      '/people',
      `buildBaseURL works for query`
    );

    assert.strictEqual(
      buildBaseURL({
        op: 'findMany',
        identifiers: [
          { type: 'user', id: '1' },
          { type: 'user', id: '2' },
        ],
        resourcePath: 'people',
      }),
      '/people',
      `buildBaseURL works for findMany`
    );
  });

  test('namespace uses local when present (no global config)', function (assert) {
    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
        namespace: 'api/v1',
      }),
      '/api/v1/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  test('namespace (global config)', function (assert) {
    setBuildURLConfig({ namespace: 'api/v2', host: '' });
    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
      }),
      '/api/v2/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  test('namespace uses local when present (global config)', function (assert) {
    setBuildURLConfig({ namespace: 'api/v2', host: '' });
    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
        namespace: 'api/v3',
      }),
      '/api/v3/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  test('host uses local when present (no global config)', function (assert) {
    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
        host: 'https://api.example.com',
      }),
      'https://api.example.com/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  test('host (global config)', function (assert) {
    setBuildURLConfig({ namespace: '', host: 'https://api2.example.com' });
    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
      }),
      'https://api2.example.com/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  test('host uses local when present (global config)', function (assert) {
    setBuildURLConfig({ namespace: '', host: 'https://api2.example.com' });
    assert.strictEqual(
      buildBaseURL({
        op: 'findRelatedResource',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
        host: 'https://api3.example.com',
      }),
      'https://api3.example.com/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });
});
