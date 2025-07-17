import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { FetchManager, SnapshotRecordArray } from '@ember-data/legacy-compat/-private';
import Model, { attr } from '@ember-data/model';
import { createDeferred } from '@ember-data/request';
import type Store from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import { Context } from '@warp-drive/core/reactive/-private';
import { Type } from '@warp-drive/core-types/symbols';

class Tag extends Model {
  @attr declare name: string;
  declare [Type]: 'tag';
}

module('unit/record-arrays/live-array - LiveArray', function (hooks) {
  setupTest(hooks);

  test('default initial state', function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const recordArray = store.peekAll('tag');

    assert.false(recordArray.isUpdating, 'record is not updating');
    assert.strictEqual(recordArray.modelName, 'tag', 'has modelName');
    assert.deepEqual(recordArray[Context].source, [], 'content is empty');
    assert.deepEqual(recordArray.slice(), [], 'no records available');

    const tag = store.push({
      data: {
        type: 'tag',
        id: '1',
        attributes: { name: 'Haines' },
      },
    });

    assert.deepEqual(recordArray.slice(), [tag], 'one record available');
  });

  testInDebug('Mutation throws error', function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const recordArray = store.peekAll('tag');
    const tag = store.push({
      data: {
        type: 'tag',
        id: '1',
        attributes: { name: 'Haines' },
      },
    });
    assert.deepEqual(recordArray.slice(), [tag], 'one record available');

    assert.throws(
      () => {
        recordArray.splice(0, 1);
      },
      Error('Mutating this array of records via splice is not allowed.'),
      'throws error'
    );
  });

  test('#access by index', function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    store.push({
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

    const recordArray = store.peekAll<Tag>('tag');

    assert.strictEqual(recordArray.length, 3);
    assert.strictEqual(recordArray[0].id, '1');
    assert.strictEqual(recordArray[1].id, '3');
    assert.strictEqual(recordArray[2].id, '5');
    assert.strictEqual(recordArray[3], undefined);
  });

  test('#update', async function (assert) {
    let findAllCalled = 0;
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const adapter = store.adapterFor('application');
    const deferred = createDeferred();
    adapter.findAll = (..._args: unknown[]) => {
      if (findAllCalled) {
        findAllCalled++;
        return deferred.promise;
      }
      findAllCalled++;
      return Promise.resolve({
        data: [],
      });
    };

    const recordArray = await store.findAll('tag', {});

    assert.false(recordArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(findAllCalled, 1);

    const updateResult = recordArray.update();
    assert.true(recordArray.isUpdating, 'should be updating');

    deferred.resolve({
      data: [
        {
          type: 'tag',
          id: '1',
          attributes: { name: 'Hanes' },
        },
      ],
    });
    await updateResult;

    assert.strictEqual(findAllCalled, 2);
    assert.strictEqual(recordArray.length, 1);
    assert.false(recordArray.isUpdating, 'should no longer be updating');
  });

  test('#update while updating', async function (assert) {
    let findAllCalled = 0;
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const adapter = store.adapterFor('application');
    const deferred = createDeferred();
    adapter.findAll = (..._args: unknown[]) => {
      if (findAllCalled) {
        findAllCalled++;
        return deferred.promise;
      }
      findAllCalled++;
      return Promise.resolve({
        data: [],
      });
    };

    const recordArray = await store.findAll('tag', {});

    assert.false(recordArray.isUpdating, 'should not yet be updating');
    assert.strictEqual(findAllCalled, 1);

    const updateResult = recordArray.update();
    assert.true(recordArray.isUpdating, 'should be updating');
    const updateResult2 = recordArray.update();

    deferred.resolve({
      data: [
        {
          type: 'tag',
          id: '1',
          attributes: { name: 'Hanes' },
        },
      ],
    });
    await updateResult;
    await updateResult2;

    assert.strictEqual(findAllCalled, 2);
    assert.strictEqual(recordArray.length, 1);
    assert.false(recordArray.isUpdating, 'should no longer be updating');
  });

  test('#save', async function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const [record1] = store.push<Tag>({
      data: [
        {
          id: '1',
          type: 'tag',
          attributes: { name: 'Tag One' },
        },
        {
          id: '2',
          type: 'tag',
          attributes: { name: 'Tag Two' },
        },
      ],
    });
    const recordArray = store.peekAll<Tag>('tag');

    let model1Saved = 0;
    let model2Saved = 0;
    store.saveRecord = (record) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      record === record1 ? model1Saved++ : model2Saved++;
      return Promise.resolve(record);
    };

    assert.strictEqual(model1Saved, 0, 'save not yet called');
    assert.strictEqual(model2Saved, 0, 'save not yet called');

    const result = recordArray.save();

    assert.strictEqual(model1Saved, 1, 'save was called for model1');
    assert.strictEqual(model2Saved, 1, 'save was called for mode2');

    const r = await result;
    assert.strictEqual(r, recordArray, 'save promise should fulfill with the original recordArray');
  });

  test('Create A SnapshotRecordArray', function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    store._fetchManager = new FetchManager(store);

    const model1 = {
      id: '1',
      type: 'tag',
    };

    const model2 = {
      id: '2',
      type: 'tag',
    };
    store.push({
      data: [model1, model2],
    });

    const snapshot = new SnapshotRecordArray(store, 'tag', {});
    const [snapshot1, snapshot2] = snapshot.snapshots();

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
