import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { SOURCE } from '@ember-data/store/-private';

import { startWatching, watchProperties } from '../../helpers/watch-property';

let store;

const Person = Model.extend({
  name: attr('string'),
  toString() {
    return `<Person#${this.id}>`;
  },
});

module('integration/peeked-records', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
    store = this.owner.lookup('service:store');
  });

  test('repeated calls to peekAll in separate run-loops works as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state initial access');

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'John',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Joe',
          },
        },
      ],
    });
    await settled();

    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after a single push with multiple records to add'
    );

    store.peekAll('person');

    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state has not changed after another call to peek'
    );
  });

  test('peekAll in the same run-loop as push works as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state initial');

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'John',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Joe',
          },
        },
      ],
    });
    store.peekAll('person');
    await settled();

    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after a single push with multiple records to add'
    );

    store.peekAll('person');

    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state has not changed after another call to peek'
    );
  });

  test('newly created records notify the array as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state initial');

    const aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });
    await settled();

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is created');

    aNewlyCreatedRecord.unloadRecord();
    await settled();

    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state when a new record is unloaded');
  });

  test('immediately peeking newly created records works as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);
    assert.strictEqual(peekedRecordArray.length, 0);
    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state initial');

    const aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    let records = store.peekAll('person');
    assert.strictEqual(records.length, 1, 'we see the new record');

    // we should not have notified the array yet because ember schedules this async
    await settled();
    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is created');

    aNewlyCreatedRecord.unloadRecord();
    records = store.peekAll('person');
    assert.strictEqual(records.length, 0);

    await settled();

    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state when a new record is unloaded');
  });

  test('unloading newly created records notify the array as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);
    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state init');
    const aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    // we should not have notified the array yet because ember schedules this async
    await settled();

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is created');

    aNewlyCreatedRecord.unloadRecord();
    await settled();

    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state when a new record is unloaded');
  });

  test('immediately peeking after unloading newly created records works as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);
    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state init');

    const aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    await settled();

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is created');

    aNewlyCreatedRecord.unloadRecord();
    store.peekAll('person');
    await settled();

    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state when a new record is unloaded');
  });

  test('unloadAll followed by peekAll in the same run-loop works as expected', async function (assert) {
    const peekedRecordArray = store.peekAll('person');
    assert.strictEqual(peekedRecordArray.length, 0, 'length is 0');
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);
    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state init');

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'John',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Joe',
          },
        },
      ],
    });
    await settled();

    store.peekAll('person');

    assert.strictEqual(peekedRecordArray.length, 2, 'length is 2');
    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after a single push with multiple records to add'
    );

    store.unloadAll('person');

    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after unloadAll has not changed yet'
    );

    assert.strictEqual(peekedRecordArray[SOURCE].length, 2, 'Array length is unchanged before the next peek');

    await settled();
    store.peekAll('person');

    assert.strictEqual(peekedRecordArray.length, 0, 'We no longer have any array content');

    assert.watchedPropertyCounts(
      watcher,
      { length: 3, '[]': 3 },
      'RecordArray state after a follow up peekAll reflects unload changes'
    );
  });

  test('push+materialize => unloadAll => push+materialize works as expected', async function (assert) {
    async function push() {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'John',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Joe',
            },
          },
        ],
      });
      await settled();
    }
    async function unload() {
      store.unloadAll('person');
      await settled();
    }
    async function peek() {
      const result = store.peekAll('person');
      await settled();
      return result;
    }

    const peekedRecordArray = await peek();
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);
    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state init');

    await push();
    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after a single push with multiple records to add'
    );

    await unload();
    assert.strictEqual(peekedRecordArray.length, 0, 'We no longer have any array content');
    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state has signaled the unload');

    await push();
    assert.strictEqual(peekedRecordArray.length, 2, 'We have array content');
    assert.watchedPropertyCounts(watcher, { length: 4, '[]': 4 }, 'RecordArray state now has records again');
  });

  test('push-without-materialize => unloadAll => push-without-materialize works as expected', async function (assert) {
    async function _push() {
      store._push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'John',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Joe',
            },
          },
        ],
      });
      await settled();
    }
    async function unload() {
      store.unloadAll('person');
      await settled();
    }
    async function peek() {
      const result = store.peekAll('person');
      await settled();
      return result;
    }

    const peekedRecordArray = await peek();
    const watcher = watchProperties.call(this, peekedRecordArray, ['length', '[]']);
    await startWatching.call(this);
    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state init');

    await _push();
    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after a single push with multiple records to add'
    );

    await unload();
    assert.strictEqual(peekedRecordArray.length, 0, 'We no longer have any array content');
    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state has signaled the unload');

    await _push();
    assert.strictEqual(peekedRecordArray.length, 2, 'We have array content');
    assert.watchedPropertyCounts(watcher, { length: 4, '[]': 4 }, 'RecordArray state now has records again');
  });
});
