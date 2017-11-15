import { A } from '@ember/array';
import { SnapshotRecordArray } from 'ember-data/-private';
import { module, test } from 'qunit';

module('Unit - snapshot-record-array');

test('constructor', function(assert) {
  let array = A([1, 2]);
  array.type = 'some type';
  let meta = { };
  let options = {
    adapterOptions: 'some options',
    include: 'include me'
  };

  let snapshot = new SnapshotRecordArray(array, meta, options);

  assert.equal(snapshot.length, 2);
  assert.equal(snapshot.meta, meta);
  assert.equal(snapshot.type, 'some type');
  assert.equal(snapshot.adapterOptions, 'some options');
  assert.equal(snapshot.include, 'include me');
});

test('#snapshot', function(assert) {
  let array = A([1, 2]);
  let didTakeSnapshot = 0;
  let snapshotTaken = {};

  array.type = 'some type';
  array._takeSnapshot = function() {
    didTakeSnapshot++;
    return snapshotTaken;
  };

  let meta = { };
  let options = {
    adapterOptions: 'some options',
    include: 'include me'
  };

  let snapshot = new SnapshotRecordArray(array, meta, options);

  assert.equal(didTakeSnapshot, 0, 'no shapshot shouldn yet be taken');
  assert.equal(snapshot.snapshots(), snapshotTaken, 'should be correct snapshot');
  assert.equal(didTakeSnapshot, 1, 'one snapshot should have been taken');
  assert.equal(snapshot.snapshots(), snapshotTaken, 'should return the exact same snapshot');
  assert.equal(didTakeSnapshot, 1, 'still only one snapshot should have been taken');
});

test('SnapshotRecordArray.type loads the class lazily', function(assert) {
  let array = A([1, 2]);
  let typeLoaded = false;

  Object.defineProperty(array, 'type', {
    get() {
      typeLoaded = true;
      return 'some type';
    }
  });

  let meta = { };
  let options = {
    adapterOptions: 'some options',
    include: 'include me'
  };

  let snapshot = new SnapshotRecordArray(array, meta, options);

  assert.equal(false, typeLoaded, 'model class is not eager loaded');
  assert.equal(snapshot.type, 'some type');
  assert.equal(true, typeLoaded, 'model class is loaded');
});
