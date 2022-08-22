import { A } from '@ember/array';
import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import RSVP, { resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { SnapshotRecordArray } from '@ember-data/store/-private';

const { RecordArray } = DS;

class Tag extends Model {
  @attr
  name;
}

module('unit/record-arrays/record-array - DS.RecordArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    let recordArray = RecordArray.create({ modelName: 'recordType', isLoaded: false, store: null });

    assert.false(get(recordArray, 'isLoaded'), 'record is not loaded');
    assert.false(get(recordArray, 'isUpdating'), 'record is not updating');
    assert.strictEqual(get(recordArray, 'modelName'), 'recordType', 'has modelName');
    assert.strictEqual(get(recordArray, 'content'), null, 'content is not defined');
    assert.strictEqual(get(recordArray, 'store'), null, 'no store with recordArray');
  });

  test('custom initial state', async function (assert) {
    let content = A();
    let store = {};
    let recordArray = RecordArray.create({
      modelName: 'apple',
      isLoaded: true,
      content,
      store,
    });
    assert.true(get(recordArray, 'isLoaded'));
    assert.false(get(recordArray, 'isUpdating')); // cannot set as default value:
    assert.strictEqual(get(recordArray, 'modelName'), 'apple');
    assert.deepEqual(get(recordArray, 'content'), content);
    assert.strictEqual(get(recordArray, 'store'), store);
  });

  test('#replace() throws error', async function (assert) {
    let recordArray = RecordArray.create({ modelName: 'recordType' });

    assert.throws(
      () => {
        recordArray.replace();
      },
      Error('The result of a server query (for all recordType types) is immutable. To modify contents, use toArray()'),
      'throws error'
    );
  });

  test('#objectAtContent', async function (assert) {
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

    let recordArray = RecordArray.create({
      modelName: 'recordType',
      content: A(records.map((r) => recordIdentifierFor(r))),
      store,
    });

    assert.strictEqual(get(recordArray, 'length'), 3);
    assert.strictEqual(recordArray.objectAtContent(0).id, '1');
    assert.strictEqual(recordArray.objectAtContent(1).id, '3');
    assert.strictEqual(recordArray.objectAtContent(2).id, '5');
    assert.strictEqual(recordArray.objectAtContent(3), undefined);
  });

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

    let recordArray = RecordArray.create({
      modelName: 'recordType',
      store,
    });

    assert.false(get(recordArray, 'isUpdating'), 'should not yet be updating');

    assert.strictEqual(findAllCalled, 0);

    let updateResult = recordArray.update();

    assert.strictEqual(findAllCalled, 1);

    deferred.resolve('return value');

    assert.true(get(recordArray, 'isUpdating'), 'should be updating');

    return updateResult.then((result) => {
      assert.strictEqual(result, 'return value');
      assert.false(get(recordArray, 'isUpdating'), 'should no longer be updating');
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

    let recordArray = RecordArray.create({
      modelName: { modelName: 'recordType' },
      store,
    });

    assert.false(get(recordArray, 'isUpdating'), 'should not be updating');
    assert.strictEqual(findAllCalled, 0);

    let updateResult1 = recordArray.update();

    assert.strictEqual(findAllCalled, 1);

    let updateResult2 = recordArray.update();

    assert.strictEqual(findAllCalled, 1);

    assert.strictEqual(updateResult1, updateResult2);

    deferred.resolve('return value');

    assert.true(get(recordArray, 'isUpdating'), 'should be updating');

    return updateResult1.then((result) => {
      assert.strictEqual(result, 'return value');
      assert.false(get(recordArray, 'isUpdating'), 'should no longer be updating');
    });
  });

  test('#_updateState', async function (assert) {
    let content = A();
    let recordArray = RecordArray.create({
      content,
    });

    let model1 = { lid: '@lid:model-1' };
    let model2 = { lid: '@lid:model-2' };
    let model3 = { lid: '@lid:model-3' };

    assert.strictEqual(recordArray.content.length, 0);
    assert.strictEqual(
      recordArray._updateState(new Map([[model1, 'del']])),
      undefined,
      '_updateState has no return value'
    );
    assert.deepEqual(recordArray.content, [], 'now contains no models');

    recordArray._updateState(
      new Map([
        [model1, 'add'],
        [model2, 'add'],
      ])
    );

    assert.deepEqual(recordArray.content, [model1, model2], 'now contains model1, model2,');
    assert.strictEqual(
      recordArray._updateState(new Map([[model1, 'del']])),
      undefined,
      '_updateState has no return value'
    );
    assert.deepEqual(recordArray.content, [model2], 'now only contains model2');
    assert.strictEqual(
      recordArray._updateState(new Map([[model2, 'del']])),
      undefined,
      '_updateState has no return value'
    );
    assert.deepEqual(recordArray.content, [], 'now contains no models');

    recordArray._updateState(
      new Map([
        [model1, 'add'],
        [model2, 'add'],
        [model3, 'add'],
      ])
    );

    assert.strictEqual(
      recordArray._updateState(
        new Map([
          [model1, 'del'],
          [model3, 'del'],
        ])
      ),
      undefined,
      '_updateState has no return value'
    );

    assert.deepEqual(recordArray.content, [model2], 'now contains model2');
    assert.strictEqual(
      recordArray._updateState(new Map([[model2, 'del']])),
      undefined,
      '_updateState has no return value'
    );
    assert.deepEqual(recordArray.content, [], 'now contains no models');
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
    let identifiers = A([recordIdentifierFor(record1), recordIdentifierFor(record2)]);
    let recordArray = RecordArray.create({
      content: identifiers,
      store,
    });
    record1.save = () => {
      model1Saved++;
      return resolve(this);
    };
    record2.save = () => {
      model2Saved++;
      return resolve(this);
    };

    let model1Saved = 0;
    let model2Saved = 0;

    assert.strictEqual(model1Saved, 0, 'save not yet called');
    assert.strictEqual(model2Saved, 0, 'save not yet called');

    let result = recordArray.save();

    assert.strictEqual(model1Saved, 1, 'save was called for model1');
    assert.strictEqual(model2Saved, 1, 'save was called for mode2');

    const r = await result;
    assert.strictEqual(r.id, result.id, 'save promise should fulfill with the original recordArray');
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

    let recordArray = RecordArray.create({
      content: A(records.map((r) => recordIdentifierFor(r))),
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
