import { A } from '@ember/array';

import { module, test } from 'qunit';

import { SnapshotRecordArray } from '@ember-data/store/-private';

module('Unit - snapshot-record-array', function () {
  test('constructor', function (assert) {
    let array = A([1, 2]);
    array.type = 'some type';
    let meta = {};
    let options = {
      adapterOptions: 'some options',
      include: 'include me',
    };

    let snapshot = new SnapshotRecordArray(array, meta, options);

    assert.strictEqual(snapshot.length, 2);
    assert.strictEqual(snapshot.meta, meta);
    assert.strictEqual(snapshot.type, 'some type');
    assert.strictEqual(snapshot.adapterOptions, 'some options');
    assert.strictEqual(snapshot.include, 'include me');
  });

  test('#snapshot', function (assert) {
    let array = A([1, 2]);
    let didTakeSnapshot = 0;
    let snapshotTaken = {};

    array.type = 'some type';
    array._takeSnapshot = function () {
      didTakeSnapshot++;
      return snapshotTaken;
    };

    let meta = {};
    let options = {
      adapterOptions: 'some options',
      include: 'include me',
    };

    let snapshot = new SnapshotRecordArray(array, meta, options);

    assert.strictEqual(didTakeSnapshot, 0, 'no shapshot shouldn yet be taken');
    assert.strictEqual(snapshot.snapshots(), snapshotTaken, 'should be correct snapshot');
    assert.strictEqual(didTakeSnapshot, 1, 'one snapshot should have been taken');
    assert.strictEqual(snapshot.snapshots(), snapshotTaken, 'should return the exact same snapshot');
    assert.strictEqual(didTakeSnapshot, 1, 'still only one snapshot should have been taken');
  });

  test('SnapshotRecordArray.type loads the class lazily', function (assert) {
    let array = A([1, 2]);
    let typeLoaded = false;

    Object.defineProperty(array, 'type', {
      get() {
        typeLoaded = true;
        return 'some type';
      },
    });

    let meta = {};
    let options = {
      adapterOptions: 'some options',
      include: 'include me',
    };

    let snapshot = new SnapshotRecordArray(array, meta, options);

    assert.false(typeLoaded, 'model class is not eager loaded');
    assert.strictEqual(snapshot.type, 'some type');
    assert.true(typeLoaded, 'model class is loaded');
  });
});
