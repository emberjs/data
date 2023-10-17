import { module, test } from '@warp-drive/diagnostic';

import { buildBaseURL, setBuildURLConfig } from '@ember-data/request-utils';
import { test as debug } from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('buildBaseURL', function (hooks) {
  hooks.afterEach(function () {
    setBuildURLConfig({ host: '', namespace: '' });
  });

  test('simple cases (no optional options and no global config)', function (assert) {
    assert.equal(
      buildBaseURL({
        op: 'findRecord',
        identifier: { type: 'user', id: '1' },
      }),
      '/user/1',
      `buildBaseURL works for findRecord`
    );
    assert.equal(
      buildBaseURL({
        op: 'updateRecord',
        identifier: { type: 'user', id: '1' },
      }),
      '/user/1',
      `buildBaseURL works for updateRecord`
    );

    assert.equal(
      buildBaseURL({
        op: 'deleteRecord',
        identifier: { type: 'user', id: '1' },
      }),
      '/user/1',
      `buildBaseURL works for deleteRecord`
    );

    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
        identifier: { type: 'user', id: '1' },
        fieldPath: 'bestFriend',
      }),
      '/user/1/bestFriend',
      `buildBaseURL works for findRelatedRecord`
    );

    assert.equal(
      buildBaseURL({
        op: 'findRelatedCollection',
        identifier: { type: 'user', id: '1' },
        fieldPath: 'friends',
      }),
      '/user/1/friends',
      `buildBaseURL works for findRelatedCollection`
    );

    assert.equal(
      buildBaseURL({
        op: 'query',
        identifier: { type: 'user' },
      }),
      '/user',
      `buildBaseURL works for query`
    );

    assert.equal(
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
    assert.equal(
      buildBaseURL({
        op: 'findRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
      }),
      '/people/1',
      `buildBaseURL works for findRecord`
    );
    assert.equal(
      buildBaseURL({
        op: 'updateRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
      }),
      '/people/1',
      `buildBaseURL works for updateRecord`
    );

    assert.equal(
      buildBaseURL({
        op: 'deleteRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
      }),
      '/people/1',
      `buildBaseURL works for deleteRecord`
    );

    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
      }),
      '/people/1/bestFriend',
      `buildBaseURL works for findRelatedRecord`
    );

    assert.equal(
      buildBaseURL({
        op: 'findRelatedCollection',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'friends',
      }),
      '/people/1/friends',
      `buildBaseURL works for findRelatedCollection`
    );

    assert.equal(
      buildBaseURL({
        op: 'query',
        identifier: { type: 'user' },
        resourcePath: 'people',
      }),
      '/people',
      `buildBaseURL works for query`
    );

    assert.equal(
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
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
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
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
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
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
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
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
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
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
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
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        fieldPath: 'bestFriend',
        host: 'https://api3.example.com',
      }),
      'https://api3.example.com/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  test('host may start with a /', function (assert) {
    assert.equal(
      buildBaseURL({
        op: 'findRelatedRecord',
        identifier: { type: 'user', id: '1' },
        resourcePath: 'people',
        host: '/api',
        fieldPath: 'bestFriend',
      }),
      '/api/people/1/bestFriend',
      `buildBaseURL works as expected`
    );
  });

  debug('throws when no op is provided', async function (assert) {
    await assert.expectAssertion(() => {
      // @ts-expect-error testing invalid input
      buildBaseURL({});
    }, /buildBaseURL: You must pass `op` as part of options/);
  });

  debug('throws when an invalid op is provided', async function (assert) {
    await assert.expectAssertion(() => {
      // @ts-expect-error testing invalid input
      buildBaseURL({ op: 'not-an-op', identifier: { type: 'user', id: '1' } });
    }, /buildBaseURL: You tried to build a not-an-op request to user but op must be one of/);
  });

  debug('throws when no identifier is provided', async function (assert) {
    await assert.expectAssertion(() => {
      // @ts-expect-error testing invalid input
      buildBaseURL({ op: 'findRecord' });
    }, /buildBaseURL: You must pass `identifier` as part of options/);
  });

  debug('throws when identifier is missing type', async function (assert) {
    await assert.expectAssertion(() => {
      // @ts-expect-error testing invalid input
      buildBaseURL({ op: 'findRecord', identifier: { id: '1' } });
    }, /You must pass valid `identifier` as part of options, expected 'type'/);
  });

  debug('throws when identifier is missing id', async function (assert) {
    await assert.expectAssertion(() => {
      // @ts-expect-error testing invalid input
      buildBaseURL({ op: 'findRecord', identifier: { type: 'user' } });
    }, /You must pass valid `identifier` as part of options, expected 'id'/);
  });
});
