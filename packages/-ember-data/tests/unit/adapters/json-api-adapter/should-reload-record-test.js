import { module, test } from 'qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';

module('unit/adapters/json-api-adapter/should-reload-record', function() {
  test('shouldReloadRecord() with same fields', function(assert) {
    const adapter = JSONAPIAdapter.create();

    const record = new RecordStub('1');
    let snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    let result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with initial call');

    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with same instance and fields');

    snapshotStub = createSnapshotStub('2', { post: 'name,date', category: 'drama' }, new RecordStub('2'));
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with different snapshot id but same fields');
  });

  test('shouldReloadRecord() with different fields', function(assert) {
    const adapter = JSONAPIAdapter.create();

    const record = new RecordStub('1');
    let snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    let result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with initial call');

    snapshotStub = createSnapshotStub('1', { comment: 'title', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with different fields');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false if requery with same fields as initial');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'comedy' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with other keys than the first different');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false if requery with same fields as initial');
  });

  test('shouldReloadRecord() with less fields', function(assert) {
    const adapter = JSONAPIAdapter.create();

    const record = new RecordStub('1');
    let snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama,comedy' }, record);
    let result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, true, 'is true with initial call');

    snapshotStub = createSnapshotStub('1', { post: 'name', category: 'drama,comedy' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with less values for post');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with less values for cateogry');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with same fields as initial');

    snapshotStub = createSnapshotStub('1', { post: 'name,date' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with no category field');

    snapshotStub = createSnapshotStub('1', { post: 'name,date', category: 'drama,comedy' }, record);
    result = adapter.shouldReloadRecord({}, snapshotStub);

    assert.equal(result, false, 'is false with same fields as initial');
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
