import { module, test } from 'qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';

module('unit/adapters/json-api-adapter/should-reload-record', function() {
  test('shouldReloadRecord() returns false if fetch same record with same fields', function(assert) {
    const adapter = JSONAPIAdapter.create();

    const record = new RecordStub('1');
    let snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    let result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with initial call');

    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with same instance and fields');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with different instance but same fields');

    snapshotStub = createSnapshotStub('2', { post: 'name,date', category: 'drama' }, new RecordStub('2'));
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with different snapshot id');
  });

  test('shouldReloadRecord() returns true if fetch same record with different fields', function(assert) {
    const adapter = JSONAPIAdapter.create();

    const record = new RecordStub('1');
    let snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);

    let result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with initial call');

    snapshotStub = createSnapshotStub('1', { comment: 'title', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true after call with different fields');

    snapshotStub = createSnapshotStub('1', { post: 'name', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with different values for fields');
  });
});

class RecordStub {
  constructor(id) {
    this.id = id;
  }
}

function createSnapshotStub(id, fields, record) {
  return {
    get record() {
      return record;
    },
    id,
    adapterOptions: {
      fields: {
        ...fields,
      },
    },
  };
}
