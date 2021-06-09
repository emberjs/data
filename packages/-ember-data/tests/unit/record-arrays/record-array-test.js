import { A } from '@ember/array';
import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import RSVP, { resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

const { RecordArray } = DS;

class Tag extends Model {
  @attr
  name;
}

module('unit/record-arrays/record-array - DS.RecordArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    let recordArray = RecordArray.create({ modelName: 'recordType' });

    assert.false(get(recordArray, 'isLoaded'), 'record is not loaded');
    assert.false(get(recordArray, 'isUpdating'), 'record is not updating');
    assert.equal(get(recordArray, 'modelName'), 'recordType', 'has modelName');
    assert.equal(get(recordArray, 'content'), undefined, 'content is not defined');
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
    assert.true(recordArray.isLoaded, 'we are loading');
    assert.false(recordArray.isUpdating, 'isUpdating is not settable during create'); // cannot set as default value:
    assert.equal(recordArray.modelName, 'apple', 'we have the right modelName');
    assert.deepEqual(recordArray.content, content);
    assert.strictEqual(recordArray.store, store, 'we have the store instance');
  });

  testInDebug('cannot set isUpdating in init', async function (assert) {
    try {
      RecordArray.create({
        modelName: 'apple',
        isLoaded: true,
        isUpdating: true,
        content: A(),
        store: {},
      });
      assert.ok(false, 'we should have erred but did not');
    } catch (e) {
      assert.strictEqual(
        e.message,
        'Assertion Failed: Cannot initialize RecordArray with isUpdating',
        'we errored appropriately'
      );
    }
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

    assert.equal(get(recordArray, 'length'), 3);
    assert.equal(recordArray.objectAtContent(0).id, '1');
    assert.equal(recordArray.objectAtContent(1).id, '3');
    assert.equal(recordArray.objectAtContent(2).id, '5');
    assert.strictEqual(recordArray.objectAtContent(3), undefined);
  });

  test('#update', async function (assert) {
    let findAllCalled = 0;
    let deferred = RSVP.defer();

    const store = {
      findAll(modelName, options) {
        findAllCalled++;
        assert.equal(modelName, 'recordType');
        assert.true(options.reload, 'options should contain reload: true');
        return deferred.promise;
      },
    };

    let recordArray = RecordArray.create({
      modelName: 'recordType',
      store,
    });

    assert.false(get(recordArray, 'isUpdating'), 'should not yet be updating');

    assert.equal(findAllCalled, 0);

    let updateResult = recordArray.update();

    assert.equal(findAllCalled, 1);

    deferred.resolve('return value');

    assert.true(get(recordArray, 'isUpdating'), 'should be updating');

    return updateResult.then((result) => {
      assert.equal(result, 'return value');
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
    assert.equal(findAllCalled, 0);

    let updateResult1 = recordArray.update();

    assert.equal(findAllCalled, 1);

    let updateResult2 = recordArray.update();

    assert.equal(findAllCalled, 1);

    assert.equal(updateResult1, updateResult2);

    deferred.resolve('return value');

    assert.true(get(recordArray, 'isUpdating'), 'should be updating');

    return updateResult1.then((result) => {
      assert.equal(result, 'return value');
      assert.false(get(recordArray, 'isUpdating'), 'should no longer be updating');
    });
  });

  test('#_pushIdentifiers', async function (assert) {
    let content = A();
    let recordArray = RecordArray.create({
      content,
    });

    let model1 = {
      id: 1,
      identifier: { lid: '@ember-data:lid-model-1' },
      getRecord() {
        return this;
      },
    };
    let model2 = {
      id: 2,
      identifier: { lid: '@ember-data:lid-model-2' },
      getRecord() {
        return this;
      },
    };
    let model3 = {
      id: 3,
      identifier: { lid: '@ember-data:lid-model-3' },
      getRecord() {
        return this;
      },
    };

    assert.equal(recordArray._pushIdentifiers([model1.identifier]), undefined, '_pushIdentifiers has no return value');
    assert.deepEqual(recordArray.get('content'), [model1.identifier], 'now contains model1');

    recordArray._pushIdentifiers([model1.identifier]);
    assert.deepEqual(
      recordArray.get('content'),
      [model1.identifier, model1.identifier],
      'allows duplicates, because record-array-manager ensures no duplicates, this layer should not double check'
    );

    recordArray._removeIdentifiers([model1.identifier]);
    recordArray._pushIdentifiers([model1.identifier]);

    // can add multiple models at once
    recordArray._pushIdentifiers([model2.identifier, model3.identifier]);
    assert.deepEqual(
      recordArray.get('content'),
      [model1.identifier, model2.identifier, model3.identifier],
      'now contains model1, model2, model3'
    );
  });

  test('#_removeIdentifiers', async function (assert) {
    let content = A();
    let recordArray = RecordArray.create({
      content,
    });

    let model1 = {
      id: 1,
      identifier: { lid: '@ember-data:lid-model-1' },
      getRecord() {
        return 'model-1';
      },
    };
    let model2 = {
      id: 2,
      identifier: { lid: '@ember-data:lid-model-2' },
      getRecord() {
        return 'model-2';
      },
    };
    let model3 = {
      id: 3,
      identifier: { lid: '@ember-data:lid-model-3' },
      getRecord() {
        return 'model-3';
      },
    };

    assert.equal(recordArray.get('content').length, 0);
    assert.equal(
      recordArray._removeIdentifiers([model1.identifier]),
      undefined,
      '_removeIdentifiers has no return value'
    );
    assert.deepEqual(recordArray.get('content'), [], 'now contains no models');

    recordArray._pushIdentifiers([model1.identifier, model2.identifier]);

    assert.deepEqual(
      recordArray.get('content'),
      [model1.identifier, model2.identifier],
      'now contains model1, model2,'
    );
    assert.equal(
      recordArray._removeIdentifiers([model1.identifier]),
      undefined,
      '_removeIdentifiers has no return value'
    );
    assert.deepEqual(recordArray.get('content'), [model2.identifier], 'now only contains model2');
    assert.equal(
      recordArray._removeIdentifiers([model2.identifier]),
      undefined,
      '_removeIdentifiers has no return value'
    );
    assert.deepEqual(recordArray.get('content'), [], 'now contains no models');

    recordArray._pushIdentifiers([model1.identifier, model2.identifier, model3.identifier]);

    assert.equal(
      recordArray._removeIdentifiers([model1.identifier, model3.identifier]),
      undefined,
      '_removeIdentifiers has no return value'
    );

    assert.deepEqual(recordArray.get('content'), [model2.identifier], 'now contains model2');
    assert.equal(
      recordArray._removeIdentifiers([model2.identifier]),
      undefined,
      '_removeIdentifiers has no return value'
    );
    assert.deepEqual(recordArray.get('content'), [], 'now contains no models');
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
      save() {
        model2Saved++;
        return this;
      },
    };

    let [record1, record2] = store.push({
      data: [model1, model2],
    });
    let identifiers = A([recordIdentifierFor(record1), recordIdentifierFor(record2)]);
    let recordArray = RecordArray.create({
      content: identifiers,
      store,
    });
    record1._internalModel.save = () => {
      model1Saved++;
      return resolve(this);
    };
    record2._internalModel.save = () => {
      model2Saved++;
      return resolve(this);
    };

    let model1Saved = 0;
    let model2Saved = 0;

    assert.equal(model1Saved, 0, 'save not yet called');
    assert.equal(model2Saved, 0, 'save not yet called');

    let result = recordArray.save();

    assert.equal(model1Saved, 1, 'save was called for model1');
    assert.equal(model2Saved, 1, 'save was called for mode2');

    const r = await result;
    assert.equal(r.id, result.id, 'save promise should fulfill with the original recordArray');
  });

  test('#destroy', async function (assert) {
    let didUnregisterRecordArray = 0;
    let didDissociatieFromOwnRecords = 0;
    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let model1 = {
      id: 1,
      type: 'tag',
    };
    let record = store.push({
      data: model1,
    });

    const set = new Set();
    set.delete = (array) => {
      didDissociatieFromOwnRecords++;
      assert.equal(array, recordArray);
    };

    let recordArray = RecordArray.create({
      content: A([recordIdentifierFor(record)]),
      store,
      manager: {
        getRecordArraysForIdentifier() {
          return set;
        },
        unregisterRecordArray(_recordArray) {
          didUnregisterRecordArray++;
          assert.equal(recordArray, _recordArray);
        },
      },
    });

    assert.false(get(recordArray, 'isDestroyed'), 'should not be destroyed');
    assert.false(get(recordArray, 'isDestroying'), 'should not be destroying');

    assert.equal(get(recordArray, 'length'), 1, 'before destroy, length should be 1');
    assert.equal(didUnregisterRecordArray, 0, 'before destroy, we should not yet have unregisterd the record array');
    assert.equal(
      didDissociatieFromOwnRecords,
      0,
      'before destroy, we should not yet have dissociated from own record array'
    );
    recordArray.destroy();
    await settled();

    assert.equal(didUnregisterRecordArray, 1, 'after destroy we should have unregistered the record array');
    assert.equal(didDissociatieFromOwnRecords, 1, 'after destroy, we should have dissociated from own record array');

    assert.strictEqual(get(recordArray, 'content'), null);
    assert.equal(get(recordArray, 'length'), 0, 'after destroy we should have no length');
    assert.true(get(recordArray, 'isDestroyed'), 'should be destroyed');
  });

  test('#_createSnapshot', async function (assert) {
    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let model1 = {
      id: 1,
      type: 'tag',
    };

    let model2 = {
      id: 2,
      type: 'tag',
    };
    let records = store.push({
      data: [model1, model2],
    });

    let recordArray = RecordArray.create({
      content: A(records.map((r) => recordIdentifierFor(r))),
      store,
    });

    let snapshot = recordArray._createSnapshot();
    let [snapshot1, snapshot2] = snapshot.snapshots();

    assert.equal(
      snapshot1.id,
      model1.id,
      'record array snapshot should contain the first internalModel.createSnapshot result'
    );
    assert.equal(
      snapshot2.id,
      model2.id,
      'record array snapshot should contain the second internalModel.createSnapshot result'
    );
  });

  test('#destroy second', async function (assert) {
    let didUnregisterRecordArray = 0;
    let didDissociatieFromOwnRecords = 0;

    this.owner.register('model:tag', Tag);
    let store = this.owner.lookup('service:store');

    let model1 = {
      id: 1,
      type: 'tag',
    };
    let record = store.push({
      data: model1,
    });

    // TODO: this will be removed once we fix ownership related memory leaks.
    const set = new Set();
    set.delete = (array) => {
      didDissociatieFromOwnRecords++;
      assert.equal(array, recordArray);
    };
    // end TODO:

    let recordArray = RecordArray.create({
      content: A([recordIdentifierFor(record)]),
      manager: {
        getRecordArraysForIdentifier() {
          return set;
        },
        unregisterRecordArray(_recordArray) {
          didUnregisterRecordArray++;
          assert.equal(recordArray, _recordArray);
        },
      },
      store,
    });

    assert.false(get(recordArray, 'isDestroyed'), 'should not be destroyed');
    assert.false(get(recordArray, 'isDestroying'), 'should not be destroying');

    assert.equal(get(recordArray, 'length'), 1, 'before destroy, length should be 1');
    assert.equal(didUnregisterRecordArray, 0, 'before destroy, we should not yet have unregisterd the record array');
    assert.equal(
      didDissociatieFromOwnRecords,
      0,
      'before destroy, we should not yet have dissociated from own record array'
    );
    recordArray.destroy();
    await settled();

    assert.equal(didUnregisterRecordArray, 1, 'after destroy we should have unregistered the record array');
    assert.equal(didDissociatieFromOwnRecords, 1, 'after destroy, we should have dissociated from own record array');
    recordArray.destroy();

    assert.strictEqual(get(recordArray, 'content'), null);
    assert.equal(get(recordArray, 'length'), 0, 'after destroy we should have no length');
    assert.true(get(recordArray, 'isDestroyed'), 'should be destroyed');
  });
});
