import { module, test } from 'qunit';

import RESTAdapter from '@ember-data/adapter/rest';

module('unit/adapters/rest-adapter/build-query - building queries', function () {
  test('buildQuery() returns an empty query when snapshot has no query params', function (assert) {
    const adapter = RESTAdapter.create();
    const snapshotStub = {};

    const query = adapter.buildQuery(snapshotStub);

    assert.deepEqual(query, {}, 'query is empty');
  });

  test(`buildQuery - doesn't fail without a snapshot`, function (assert) {
    const adapter = RESTAdapter.create();
    const query = adapter.buildQuery();

    assert.deepEqual(query, {}, 'returns an empty query');
  });

  test('buildQuery() returns query with `include` from snapshot', function (assert) {
    const adapter = RESTAdapter.create();
    const snapshotStub = { include: 'comments' };

    const query = adapter.buildQuery(snapshotStub);

    assert.deepEqual(query, { include: 'comments' }, 'query includes `include`');
  });
});
