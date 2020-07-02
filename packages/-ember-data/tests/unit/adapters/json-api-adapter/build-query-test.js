import { module, test } from 'qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';

module('unit/adapters/json-api-adapter/build-query - building queries', function() {
  test('buildQuery() returns query with `fields` from snapshot', function(assert) {
    const adapter = JSONAPIAdapter.create();
    const snapshotStub = { fields: { post: 'name' } };

    const query = adapter.buildQuery(snapshotStub);

    assert.deepEqual(query, { fields: { post: 'name' } }, 'query includes `fields`');
  });

  test('buildQuery() returns query with `fields` and `include` from snapshot', function(assert) {
    const adapter = JSONAPIAdapter.create();
    const snapshotStub = { fields: { post: 'name', comments: 'title' }, include: 'comments' };

    const query = adapter.buildQuery(snapshotStub);

    assert.deepEqual(
      query,
      { fields: { post: 'name', comments: 'title' }, include: 'comments' },
      'query includes `fields` and `include`'
    );
  });
});
