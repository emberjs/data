import { module, test } from 'qunit';
import RSVP from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { RecordArray, SnapshotRecordArray, SOURCE } from '@ember-data/store/-private';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Tag extends Model {
  @attr
  name;
}

module('unit/record-arrays/record-array - DS.RecordArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    let recordArray = new RecordArray({ type: 'recordType', identifiers: [], store: null });

    assert.false(recordArray.isUpdating, 'record is not updating');
    assert.strictEqual(recordArray.modelName, 'recordType', 'has modelName');
    assert.deepEqual(recordArray[SOURCE], [], 'content is not defined');
    assert.strictEqual(recordArray.store, null, 'no store with recordArray');
  });

  test('custom initial state', async function (assert) {
    let store = {};
    let recordArray = new RecordArray({
      type: 'apple',
      identifiers: [],
      store,
    });
    assert.false(recordArray.isUpdating); // cannot set as default value:
    assert.strictEqual(recordArray.modelName, 'apple');
    assert.deepEqual(recordArray[SOURCE], []);
    assert.strictEqual(recordArray.store, store);
  });

  testInDebug('#replace() throws error', async function (assert) {
    let recordArray = new RecordArray({ identifiers: [], type: 'recordType' });

    assert.throws(
      () => {
        recordArray.replace();
      },
      Error('Assertion Failed: Mutating this array of records via splice is not allowed.'),
      'throws error'
    );
    assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
  });

  testInDebug('Mutation throws error', async function (assert) {
    let recordArray = new RecordArray({ identifiers: [], type: 'recordType' });

    assert.throws(
      () => {
        recordArray.splice(0, 1);
      },
      Error('Assertion Failed: Mutating this array of records via splice is not allowed.'),
      'throws error'
    );
  });

  test('#access by index', async function (assert) {
    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let records = store.push({
      data: [
        {
          type: 'tag',
          id: '1',
        },
        {
          type: 'tag',
          id: '3',
        },
        {
          type: 'tag',
          id: '5',
        },
      ],
    });

    let recordArray = new RecordArray({
      type: 'recordType',
      identifiers: records.map(recordIdentifierFor),
      store,
    });

    assert.strictEqual(recordArray.length, 3);
    assert.strictEqual(recordArray[0].id, '1');
    assert.strictEqual(recordArray[1].id, '3');
    assert.strictEqual(recordArray[2].id, '5');
    assert.strictEqual(recordArray[3], undefined);
  });

  deprecatedTest(
    '#filterBy',
    { id: 'ember-data:deprecate-array-like', until: '5.0', count: 3 },
    async function (assert) {
      this.owner.register('model:tag', Tag);
      let store = this.owner.lookup('service:store');

      let records = store.push({
        data: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'first',
            },
          },
          {
            type: 'tag',
            id: '3',
          },
          {
            type: 'tag',
            id: '5',
            attributes: {
              name: 'fifth',
            },
          },
        ],
      });

      let recordArray = new RecordArray({
        type: 'recordType',
        identifiers: records.map(recordIdentifierFor),
        store,
      });

      assert.strictEqual(recordArray.length, 3);
      assert.strictEqual(recordArray.filterBy('id', '3').length, 1);
      assert.strictEqual(recordArray.filterBy('id').length, 3);
      assert.strictEqual(recordArray.filterBy('name').length, 2);
    }
  );

  deprecatedTest(
    '#lastObject and #firstObject',
    { id: 'ember-data:deprecate-array-like', until: '5.0', count: 2 },
    async function (assert) {
      this.owner.register('model:tag', Tag);
      let store = this.owner.lookup('service:store');

      let records = store.push({
        data: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'first',
            },
          },
          {
            type: 'tag',
            id: '3',
          },
          {
            type: 'tag',
            id: '5',
            attributes: {
              name: 'fifth',
            },
          },
        ],
      });

      let recordArray = new RecordArray({
        type: 'recordType',
        identifiers: records.map(recordIdentifierFor),
        store,
      });

      assert.strictEqual(recordArray.length, 3);
      assert.strictEqual(recordArray.firstObject.id, '1');
      assert.strictEqual(recordArray.lastObject.id, '5');
    }
  );

  deprecatedTest(
    '#objectAt and #objectsAt',
    { id: 'ember-data:deprecate-array-like', until: '5.0', count: 5 },
    async function (assert) {
      this.owner.register('model:tag', Tag);
      let store = this.owner.lookup('service:store');

      let records = store.push({
        data: [
          {
            type: 'tag',
            id: '1',
            attributes: {
              name: 'first',
            },
          },
          {
            type: 'tag',
            id: '3',
          },
          {
            type: 'tag',
            id: '5',
            attributes: {
              name: 'fifth',
            },
          },
        ],
      });

      let recordArray = new RecordArray({
        type: 'recordType',
        identifiers: records.map(recordIdentifierFor),
        store,
      });

      assert.strictEqual(recordArray.length, 3);
      assert.strictEqual(recordArray.objectAt(0).id, '1');
      assert.strictEqual(recordArray.objectAt(-1).id, '5');
      assert.deepEqual(
        recordArray.objectsAt([2, 1]).map((r) => r.id),
        ['5', '3']
      );
    }
  );

  test('#update', async function (assert) {
    let findAllCalled = 0;
    let deferred = RSVP.defer();

    const store = {
      findAll(modelName, options) {
        findAllCalled++;
        assert.strictEqual(modelName, 'recordType');
        assert.true(options.reload, 'options should contain reload: true');
        return deferred.promise;
      },
    };

    let recordArray = new RecordArray({
      type: 'recordType',
      identifiers: [],
      store,
    });

    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(findAllCalled, 0);

    let updateResult = recordArray.update();

    assert.strictEqual(findAllCalled, 1);

    deferred.resolve('return value');

    assert.true(recordArray.isUpdating, 'should be updating');

    return updateResult.then((result) => {
      assert.strictEqual(result, 'return value');
      assert.false(recordArray.isUpdating, 'should no longer be updating');
    });
  });

  test('#update while updating', async function (assert) {
    let findAllCalled = 0;
    let deferred = RSVP.defer();
    const store = {
      findAll(modelName, options) {
        findAllCalled++;
        return deferred.promise;
      },
    };

    let recordArray = new RecordArray({
      type: 'recordType',
      identifiers: [],
      store,
    });

    assert.false(recordArray.isUpdating, 'should not be updating');
    assert.strictEqual(findAllCalled, 0);

    let updateResult1 = recordArray.update();

    assert.strictEqual(findAllCalled, 1);

    let updateResult2 = recordArray.update();

    assert.strictEqual(findAllCalled, 1);

    assert.strictEqual(updateResult1, updateResult2);

    deferred.resolve('return value');

    assert.true(recordArray.isUpdating, 'should be updating');

    return updateResult1.then((result) => {
      assert.strictEqual(result, 'return value');
      assert.false(recordArray.isUpdating, 'should no longer be updating');
    });
  });

  test('#save', async function (assert) {
    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let model1 = {
      id: '1',
      type: 'tag',
    };
    let model2 = {
      id: '2',
      type: 'tag',
    };

    let [record1, record2] = store.push({
      data: [model1, model2],
    });
    let identifiers = [recordIdentifierFor(record1), recordIdentifierFor(record2)];
    let recordArray = new RecordArray({
      identifiers,
      store,
    });

    let model1Saved = 0;
    let model2Saved = 0;
    store.saveRecord = (record) => {
      record === record1 ? model1Saved++ : model2Saved++;
      return Promise.resolve(record);
    };

    assert.strictEqual(model1Saved, 0, 'save not yet called');
    assert.strictEqual(model2Saved, 0, 'save not yet called');

    let result = recordArray.save();

    assert.strictEqual(model1Saved, 1, 'save was called for model1');
    assert.strictEqual(model2Saved, 1, 'save was called for mode2');

    const r = await result;
    assert.strictEqual(r, recordArray, 'save promise should fulfill with the original recordArray');
  });

  test('Create A SnapshotRecordArray', async function (assert) {
    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let model1 = {
      id: '1',
      type: 'tag',
    };

    let model2 = {
      id: '2',
      type: 'tag',
    };
    let records = store.push({
      data: [model1, model2],
    });

    let recordArray = new RecordArray({
      identifiers: records.map(recordIdentifierFor),
      store,
    });

    let snapshot = new SnapshotRecordArray(store, recordArray, {});
    let [snapshot1, snapshot2] = snapshot.snapshots();

    assert.strictEqual(
      snapshot1.id,
      String(model1.id),
      'record array snapshot should contain the first createSnapshot result'
    );
    assert.strictEqual(
      snapshot2.id,
      String(model2.id),
      'record array snapshot should contain the second createSnapshot result'
    );
  });
});
