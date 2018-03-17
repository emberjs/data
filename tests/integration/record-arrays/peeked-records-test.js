import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';
import { get } from '@ember/object';
import { watchProperties } from '../../helpers/watch-property';

let store;

const Person = DS.Model.extend({
  name: DS.attr('string'),
  toString() {
    return `<Person#${this.get('id')}>`;
  }
});

module('integration/unload-peeked-records', {
  beforeEach() {
    store = createStore({
      person: Person
    });
  }
});

test('repeated calls to peekAll in separate run-loops works as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

  run(() => store.push({
    data: [
      {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John'
        }
      },
      {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Joe'
        }
      }
    ]
  }));

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

test('peekAll in the same run-loop as push works as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

  run(() => {
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'John'
          }
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Joe'
          }
        }
      ]
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

test('newly created records notify the array as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

  let aNewlyCreatedRecord = run(() => store.createRecord('person', {
    name: 'James'
  }));

  assert.watchedPropertyCounts(
    watcher,
    { length: 1, '[]': 1 },
    'RecordArray state when a new record is created'
  );

  run(() => {
    aNewlyCreatedRecord.unloadRecord();
  });

  assert.watchedPropertyCounts(
    watcher,
    { length: 2, '[]': 2 },
    'RecordArray state when a new record is unloaded'
  );
});

test('immediately peeking newly created records works as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

  let aNewlyCreatedRecord = run(() => store.createRecord('person', {
    name: 'James'
  }));

  assert.watchedPropertyCounts(
    watcher,
    { length: 1, '[]': 1 },
    'RecordArray state when a new record is created'
  );

  run(() => {
    aNewlyCreatedRecord.unloadRecord();
    store.peekAll('person');
  });

  assert.watchedPropertyCounts(
    watcher,
    { length: 2, '[]': 2 },
    'RecordArray state when a new record is unloaded'
  );
});

test('unloading newly created records notify the array as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);
  let aNewlyCreatedRecord = run(() => store.createRecord('person', {
    name: 'James'
  }));

  assert.watchedPropertyCounts(
    watcher,
    { length: 1, '[]': 1 },
    'RecordArray state when a new record is created'
  );

  run(() => {
    aNewlyCreatedRecord.unloadRecord();
  });

  assert.watchedPropertyCounts(
    watcher,
    { length: 2, '[]': 2 },
    'RecordArray state when a new record is unloaded'
  );
});

test('immediately peeking after unloading newly created records works as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);
  let aNewlyCreatedRecord = run(() => store.createRecord('person', {
    name: 'James'
  }));

  assert.watchedPropertyCounts(
    watcher,
    { length: 1, '[]': 1 },
    'RecordArray state when a new record is created'
  );

  run(() => {
    aNewlyCreatedRecord.unloadRecord();
    store.peekAll('person');
  });

  assert.watchedPropertyCounts(
    watcher,
    { length: 2, '[]': 2 },
    'RecordArray state when a new record is unloaded'
  );
});

test('unloadAll followed by peekAll in the same run-loop works as expected', function(assert) {
  let peekedRecordArray = run(() => store.peekAll('person'));
  let watcher = watchProperties(peekedRecordArray, ['length', '[]']);

  run(() => {
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'John'
          }
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Joe'
          }
        }
      ]
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

    assert.equal(get(peekedRecordArray, 'length'), 2, 'Array length is unchanged before the next peek');

    store.peekAll('person');

    assert.equal(get(peekedRecordArray, 'length'), 0, 'We no longer have any array content');

    assert.watchedPropertyCounts(
      watcher,
      { length: 2, '[]': 2 },
      'RecordArray state after a follow up peekAll reflects unload changes'
    );
  });

  assert.watchedPropertyCounts(
    watcher,
    { length: 2, '[]': 2 },
    'RecordArray state has not changed any further'
  );
});
