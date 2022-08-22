import { A } from '@ember/array';

import { module, test } from 'qunit';

import { SnapshotRecordArray } from '@ember-data/store/-private';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('Unit - snapshot-record-array', function () {
  test('constructor', function (assert) {
    let array = A([1, 2]);
    array.content = [1, 2];
    let options = {
      adapterOptions: 'some options',
      include: 'include me',
    };

    let snapshot = new SnapshotRecordArray({}, array, options);

    assert.strictEqual(snapshot.length, 2);
    assert.strictEqual(snapshot.adapterOptions, 'some options');
    assert.strictEqual(snapshot.include, 'include me');
  });

  test('#snapshot', function (assert) {
    let array = A([1, 2]);
    let didTakeSnapshot = 0;
    let snapshotTaken = {};

    const mockStore = {
      _instanceCache: {
        createSnapshot() {
          didTakeSnapshot++;
          return snapshotTaken;
        },
      },
    };

    array.type = 'some type';
    array.content = ['1'];

    let options = {
      adapterOptions: 'some options',
      include: 'include me',
    };

    let snapshot = new SnapshotRecordArray(mockStore, array, options);

    assert.strictEqual(didTakeSnapshot, 0, 'no shapshot should yet be taken');
    assert.strictEqual(snapshot.snapshots()[0], snapshotTaken, 'should be correct snapshot');
    assert.strictEqual(didTakeSnapshot, 1, 'one snapshot should have been taken');
    assert.strictEqual(snapshot.snapshots()[0], snapshotTaken, 'should return the exact same snapshot');
    assert.strictEqual(didTakeSnapshot, 1, 'still only one snapshot should have been taken');
  });

  deprecatedTest(
    'SnapshotRecordArray.type loads the class lazily',
    {
      id: 'ember-data:deprecate-snapshot-model-class-access',
      count: 1,
      until: '5.0',
    },
    function (assert) {
      let array = A([1, 2]);
      let typeLoaded = false;

      Object.defineProperty(array, 'type', {
        get() {
          typeLoaded = true;
          return 'some type';
        },
      });

      let options = {
        adapterOptions: 'some options',
        include: 'include me',
      };

      let snapshot = new SnapshotRecordArray({}, array, options);

      assert.false(typeLoaded, 'model class is not eager loaded');
      assert.strictEqual(snapshot.type, 'some type');
      assert.true(typeLoaded, 'model class is loaded');
    }
  );
});
