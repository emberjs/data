import { module, test } from 'qunit';
import DS from 'ember-data';
import isEnabled from 'ember-data/-private/features';

module("unit/adapters/rest-adapter/build-query - building queries");

test("buildQuery() returns an empty query when snapshot has no query params", function(assert) {
  const adapter = DS.RESTAdapter.create();
  const snapshotStub = {};

  const query = adapter.buildQuery(snapshotStub);

  assert.deepEqual(query, {}, 'query is empty');
});

if (isEnabled('ds-finder-include')) {
  test("buildQuery() returns query with `include` from snapshot", function(assert) {
    const adapter = DS.RESTAdapter.create();
    const snapshotStub = { include: 'comments' };

    const query = adapter.buildQuery(snapshotStub);

    assert.deepEqual(query, { include: 'comments' }, 'query includes `include`');
  });
}
