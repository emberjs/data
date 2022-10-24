import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { defer, reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Person extends Model {
  @attr updatedAt;

  @attr name;

  @attr firstName;

  @attr lastName;

  toString() {
    return 'Person';
  }
}

module('integration/adapter/find-all - Finding All Records of a Type', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    let { owner } = this;

    owner.register('model:person', Person);
    owner.register('serializer:application', class extends JSONAPISerializer {});

    store = owner.lookup('service:store');
  });

  test("When all records for a type are requested, the store should call the adapter's `findAll` method.", async function (assert) {
    assert.expect(5);
    let adapter = store.adapterFor('person');

    adapter.findAll = () => {
      // this will get called twice
      assert.ok(true, "the adapter's findAll method should be invoked");

      return resolve({
        data: [
          {
            id: '1',
            type: 'person',
            attributes: {
              name: 'Braaaahm Dale',
            },
          },
        ],
      });
    };

    let allRecords = await store.findAll('person');
    assert.strictEqual(allRecords.length, 1, "the record array's length is 1 after a record is loaded into it");
    assert.strictEqual(allRecords[0].name, 'Braaaahm Dale', 'the first item in the record array is Braaaahm Dale');

    let all = await store.findAll('person');
    // Only one record array per type should ever be created (identity map)
    assert.strictEqual(
      allRecords,
      all,
      'the same record array is returned every time all records of a type are requested'
    );
  });

  test('When all records for a type are requested, a rejection should reject the promise', async function (assert) {
    assert.expect(5);
    let adapter = store.adapterFor('person');

    let count = 0;
    adapter.findAll = () => {
      // this will get called twice
      assert.ok(true, "the adapter's findAll method should be invoked");

      if (count++ === 0) {
        return reject();
      } else {
        return resolve({
          data: [
            {
              id: '1',
              type: 'person',
              attributes: {
                name: 'Braaaahm Dale',
              },
            },
          ],
        });
      }
    };

    let all = await store.findAll('person').catch(() => {
      assert.ok(true, 'The rejection should get here');
      return store.findAll('person');
    });
    assert.strictEqual(all.length, 1, "the record array's length is 1 after a record is loaded into it");
    assert.strictEqual(all[0].name, 'Braaaahm Dale', 'the first item in the record array is Braaaahm Dale');
  });

  test('When all records for a type are requested, records that are already loaded should be returned immediately.', async function (assert) {
    assert.expect(3);

    // Load a record from the server
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Jeremy Ashkenas',
        },
      },
    });

    // Create a new, unsaved record in the store
    store.createRecord('person', { name: 'Alex MacCaw' });

    let allRecords = store.peekAll('person');

    assert.strictEqual(allRecords.length, 2, "the record array's length is 2");
    assert.strictEqual(allRecords[0].name, 'Jeremy Ashkenas', 'the first item in the record array is Jeremy Ashkenas');
    assert.strictEqual(allRecords[1].name, 'Alex MacCaw', 'the second item in the record array is Alex MacCaw');
  });

  test('When all records for a type are requested, records that are created on the client should be added to the record array.', async function (assert) {
    assert.expect(3);

    let allRecords = store.peekAll('person');

    assert.strictEqual(
      allRecords.length,
      0,
      "precond - the record array's length is zero before any records are loaded"
    );

    store.createRecord('person', { name: 'Carsten Nielsen' });
    // await settled();

    assert.strictEqual(allRecords.length, 1, "the record array's length is 1");
    assert.strictEqual(allRecords[0].name, 'Carsten Nielsen', 'the first item in the record array is Carsten Nielsen');
  });

  testInDebug('When all records are requested, assert the payload is not blank', async function (assert) {
    let adapter = store.adapterFor('person');
    adapter.findAll = () => resolve({});

    assert.expectAssertion(() => {
      run(() => store.findAll('person'));
    }, /You made a 'findAll' request for 'person' records, but the adapter's response did not have any data/);
  });

  test('isUpdating is true while records are fetched', async function (assert) {
    let findAllDeferred = defer();
    let adapter = store.adapterFor('person');
    adapter.findAll = () => findAllDeferred.promise;
    adapter.shouldReloadAll = () => true;

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
        },
      ],
    });

    let persons = store.peekAll('person');
    assert.strictEqual(persons.length, 1);

    let promise = store.findAll('person');

    assert.true(persons.isUpdating);

    findAllDeferred.resolve({ data: [{ id: '2', type: 'person' }] });

    await promise;
    assert.false(persons.isUpdating);
    assert.strictEqual(persons.length, 2);
  });

  test('isUpdating is true while records are fetched in the background', async function (assert) {
    let findAllDeferred = defer();
    let adapter = store.adapterFor('person');
    adapter.findAll = () => {
      return findAllDeferred.promise;
    };
    adapter.shouldReloadAll = () => false;
    adapter.shouldBackgroundReloadAll = () => true;

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
        },
      ],
    });

    let persons = store.peekAll('person');
    assert.strictEqual(persons.length, 1);

    persons = await store.findAll('person');
    assert.true(persons.isUpdating);
    assert.strictEqual(persons.length, 1, 'persons are updated in the background');

    assert.true(persons.isUpdating);

    findAllDeferred.resolve({ data: [{ id: '2', type: 'person' }] });

    await settled();

    await findAllDeferred.promise;

    assert.false(persons.isUpdating);
    assert.strictEqual(persons.length, 2);
  });

  test('isUpdating is false if records are not fetched in the background', async function (assert) {
    let findAllDeferred = defer();
    let adapter = store.adapterFor('person');
    adapter.findAll = () => {
      return findAllDeferred.promise;
    };
    adapter.shouldReloadAll = () => false;
    adapter.shouldBackgroundReloadAll = () => false;

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
        },
      ],
    });

    let persons = store.peekAll('person');
    assert.strictEqual(persons.length, 1);

    persons = await store.findAll('person');
    assert.false(persons.isUpdating);
  });
});
