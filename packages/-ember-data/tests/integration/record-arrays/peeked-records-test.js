import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { watchProperties } from '@ember-data/unpublished-test-infra/test-support/watch-property';

let store;

const Person = Model.extend({
  name: attr('string'),
  toString() {
    return `<Person#${this.id}>`;
  },
});

module('integration/peeked-records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
    store = this.owner.lookup('service:store');
  });

  test('repeated calls to peekAll in separate run-loops works as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

    run(() =>
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
      })
    );

    assert.watchedPropertyCounts(
      watcher,
      { length: 1, '[]': 1 },
      'RecordArray state after a single push with multiple records to add'
    );

    run(() => store.peekAll('person'));

    assert.watchedPropertyCounts(
      watcher,
      { length: 1, '[]': 1 },
      'RecordArray state has not changed after another call to peek'
    );
  });

  test('peekAll in the same run-loop as push works as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

    run(() => {
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
    });

    assert.watchedPropertyCounts(
      watcher,
      { length: 1, '[]': 1 },
      'RecordArray state after a single push with multiple records to add'
    );

    run(() => store.peekAll('person'));

    assert.watchedPropertyCounts(
      watcher,
      { length: 1, '[]': 1 },
      'RecordArray state has not changed after another call to peek'
    );
  });

  test('newly created records notify the array as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);
    let aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state when a new record is created');

    run(() => {
      aNewlyCreatedRecord.unloadRecord();
    });

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is unloaded');
  });

  test('immediately peeking newly created records works as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);
    let aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state when a new record is created');

    run(() => {
      aNewlyCreatedRecord.unloadRecord();
      store.peekAll('person');
    });

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is unloaded');
  });

  test('unloading newly created records notify the array as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);
    let aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state when a new record is created');

    run(() => {
      aNewlyCreatedRecord.unloadRecord();
    });

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is unloaded');
  });

  test('immediately peeking after unloading newly created records works as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);
    let aNewlyCreatedRecord = store.createRecord('person', {
      name: 'James',
    });

    assert.watchedPropertyCounts(watcher, { length: 1, '[]': 1 }, 'RecordArray state when a new record is created');

    run(() => {
      aNewlyCreatedRecord.unloadRecord();
      store.peekAll('person');
    });

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state when a new record is unloaded');
  });

  test('unloadAll followed by peekAll in the same run-loop works as expected', function (assert) {
    let peekedRecordArray = run(() => store.peekAll('person'));
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

    run(() => {
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
    });

    run(() => {
      store.peekAll('person');

      assert.watchedPropertyCounts(
        watcher,
        { length: 1, '[]': 1 },
        'RecordArray state after a single push with multiple records to add'
      );

      store.unloadAll('person');

      assert.watchedPropertyCounts(
        watcher,
        { length: 1, '[]': 1 },
        'RecordArray state after unloadAll has not changed yet'
      );

      assert.strictEqual(get(peekedRecordArray, 'length'), 2, 'Array length is unchanged before the next peek');

      store.peekAll('person');

      assert.strictEqual(get(peekedRecordArray, 'length'), 0, 'We no longer have any array content');

      assert.watchedPropertyCounts(
        watcher,
        { length: 2, '[]': 2 },
        'RecordArray state after a follow up peekAll reflects unload changes'
      );
    });

    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state has not changed any further');
  });

  test('push+materialize => unloadAll => push+materialize works as expected', function (assert) {
    function push() {
      run(() => {
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
      });
    }
    function unload() {
      run(() => store.unloadAll('person'));
    }
    function peek() {
      return run(() => store.peekAll('person'));
    }

    let peekedRecordArray = peek();
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

    push();
    assert.watchedPropertyCounts(
      watcher,
      { length: 1, '[]': 1 },
      'RecordArray state after a single push with multiple records to add'
    );

    unload();
    assert.strictEqual(get(peekedRecordArray, 'length'), 0, 'We no longer have any array content');
    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state has signaled the unload');

    push();
    assert.strictEqual(get(peekedRecordArray, 'length'), 2, 'We have array content');
    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state now has records again');
  });

  test('push-without-materialize => unloadAll => push-without-materialize works as expected', function (assert) {
    function _push() {
      run(() => {
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
      });
    }
    function unload() {
      run(() => store.unloadAll('person'));
    }
    function peek() {
      return run(() => store.peekAll('person'));
    }

    let peekedRecordArray = peek();
    let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

    _push();
    assert.watchedPropertyCounts(
      watcher,
      { length: 1, '[]': 1 },
      'RecordArray state after a single push with multiple records to add'
    );

    unload();
    assert.strictEqual(get(peekedRecordArray, 'length'), 0, 'We no longer have any array content');
    assert.watchedPropertyCounts(watcher, { length: 2, '[]': 2 }, 'RecordArray state has signaled the unload');

    _push();
    assert.strictEqual(get(peekedRecordArray, 'length'), 2, 'We have array content');
    assert.watchedPropertyCounts(watcher, { length: 3, '[]': 3 }, 'RecordArray state now has records again');
  });
});
