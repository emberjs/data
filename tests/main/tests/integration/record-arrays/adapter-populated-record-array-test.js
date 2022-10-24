import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

const Person = Model.extend({
  name: attr('string'),
  toString() {
    return `<Person#${this.id}>`;
  },
});

module('integration/record-arrays/adapter_populated_record_array - AdapterPopulatedRecordArray', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('when a record is deleted in an adapter populated record array, it should be removed', async function (assert) {
    const ApplicationAdapter = Adapter.extend({
      deleteRecord() {
        return Promise.resolve();
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let store = this.owner.lookup('service:store');
    let recordArray = store.recordArrayManager.createArray({ type: 'person', query: null });

    let payload = {
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    };

    let results = store._push(payload);

    store.recordArrayManager.populateManagedArray(recordArray, results, payload);

    assert.strictEqual(recordArray.length, 3, 'expected recordArray to contain exactly 3 records');

    await recordArray.at(0).destroyRecord();

    assert.strictEqual(recordArray.length, 2, 'expected recordArray to contain exactly 2 records');
  });

  test('stores the metadata off the payload', async function (assert) {
    let store = this.owner.lookup('service:store');
    let recordArray = store.recordArrayManager.createArray({ type: 'person', query: null });

    let payload = {
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
      meta: {
        foo: 'bar',
      },
    };

    let results = store._push(payload);

    store.recordArrayManager.populateManagedArray(recordArray, results, payload);
    assert.strictEqual(recordArray.meta.foo, 'bar', 'expected meta.foo to be bar from payload');
  });

  test('stores the links off the payload', async function (assert) {
    let store = this.owner.lookup('service:store');
    let recordArray = store.recordArrayManager.createArray({ type: 'person', query: null });

    let payload = {
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
      links: {
        first: '/foo?page=1',
      },
    };

    let results = store._push(payload);

    store.recordArrayManager.populateManagedArray(recordArray, results, payload);
    assert.strictEqual(recordArray.links.first, '/foo?page=1', 'expected links.first to be "/foo?page=1" from payload');
  });

  test('recordArray.replace() throws error', async function (assert) {
    let store = this.owner.lookup('service:store');
    let recordArray = store.recordArrayManager.createArray({ type: 'person', query: null });

    await settled();

    assert.expectAssertion(
      () => {
        recordArray.replace();
      },
      'Assertion Failed: Mutating this array of records via splice is not allowed.',
      'throws error'
    );
    assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
  });

  test('recordArray mutation throws error', async function (assert) {
    let store = this.owner.lookup('service:store');
    let recordArray = store.recordArrayManager.createArray({ type: 'person', query: null });

    await settled();

    assert.expectAssertion(
      () => {
        recordArray.splice(0, 1);
      },
      'Assertion Failed: Mutating this array of records via splice is not allowed.',
      'throws error'
    );
  });

  test('pass record array to adapter.query regardless of its arity', async function (assert) {
    assert.expect(2);
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let payload = {
      data: [
        { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
        { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } },
      ],
    };
    let actualQuery = {};

    // arity 3
    adapter.query = function (store, type, query) {
      // Due to #6232, we now expect 5 arguments regardless of arity
      assert.strictEqual(arguments.length, 5, 'we receive 5 args to adapter query with arity 3');
      return payload;
    };

    await store.query('person', actualQuery);

    // arity 4
    adapter.query = function (store, type, query, _recordArray) {
      assert.strictEqual(arguments.length, 5, 'we receive 5 args to adapter query with arity 4');
      return payload;
    };

    await store.query('person', actualQuery);
  });

  test('loadRecord re-syncs identifiers recordArrays', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let payload = {
      data: [
        { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
        { id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } },
      ],
    };

    adapter.query = function (store, type, query, recordArray) {
      return payload;
    };

    let recordArray = await store.query('person', {});

    recordArray = await recordArray.update();
    assert.deepEqual(
      recordArray.map((r) => r.name),
      ['Scumbag Dale', 'Scumbag Katz'],
      'expected query to contain specific records'
    );

    payload = {
      data: [
        { id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } },
        { id: '3', type: 'person', attributes: { name: 'Scumbag Penner' } },
      ],
    };

    recordArray = await recordArray.update();

    assert.deepEqual(
      recordArray.map((r) => r.name),
      ['Scumbag Dale', 'Scumbag Penner'],
      'expected query to still contain specific records'
    );
  });

  test('when an adapter populated record gets updated the array contents are also updated', async function (assert) {
    assert.expect(8);

    let queryArr, findArray;
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let array = [{ id: '1', type: 'person', attributes: { name: 'Scumbag Dale' } }];

    // resemble server side filtering
    adapter.query = function (store, type, query, recordArray) {
      return { data: array.slice(query.slice) };
    };

    // implement findAll to further test that query updates won't muddle
    // with the non-query record arrays
    adapter.findAll = function (store, type, sinceToken) {
      return { data: array.slice(0) };
    };

    queryArr = await store.query('person', { slice: 1 });
    findArray = await store.findAll('person');

    assert.strictEqual(queryArr.length, 0, 'No records for this query');
    assert.false(queryArr.isUpdating, 'Record array isUpdating state updated');
    assert.strictEqual(findArray.length, 1, 'All records are included in collection array');

    // a new element gets pushed in record array
    array.push({ id: '2', type: 'person', attributes: { name: 'Scumbag Katz' } });
    await queryArr.update();

    assert.strictEqual(queryArr.length, 1, 'The new record is returned and added in adapter populated array');
    assert.false(queryArr.isUpdating, 'Record array isUpdating state updated');
    assert.strictEqual(findArray.length, 2, 'find returns 2 records');

    // element gets removed
    array.pop(0);
    await queryArr.update();

    assert.strictEqual(queryArr.length, 0, 'Record removed from array');
    // record not removed from the model collection
    assert.strictEqual(findArray.length, 2, 'Record still remains in collection array');
  });
});
