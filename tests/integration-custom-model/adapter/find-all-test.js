import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { reject, resolve, defer, Promise } from 'rsvp';
import { run } from '@ember/runloop';
import { get } from '@ember/object';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import Model from 'ember-data/model';
import { attr } from '@ember-decorators/data';
import { settled } from '@ember/test-helpers';
import { CustomModel, CustomStore } from '../base-model-class';


/*
class Person extends Model {
  @attr
  updatedAt;

  @attr
  name;

  @attr
  firstName;

  @attr
  lastName;

  toString() {
    return 'Person';
  }
}
*/

module('integration-custom-model/adapter/find-all - Finding All Records of a Type', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('model:person', CustomModel);
    owner.register('service:store', CustomStore);
    store = owner.lookup('service:store');
  });

  test("When all records for a type are requested, the store should call the adapter's `findAll` method.", async function(assert) {
    assert.expect(4);
    let adapter = store.adapterFor('person');

    adapter.findAll = () => {
      // this will get called twice
      assert.ok(true, "the adapter's findAll method should be invoked");

      return resolve({
        data: [
          {
            id: 1,
            type: 'person',
            attributes: {
              name: 'Braaaahm Dale',
            },
          },
        ],
      });
    };

    let allRecords = await store.findAll('person');
    assert.equal(
      get(allRecords, 'length'),
      1,
      "the record array's length is 1 after a record is loaded into it"
    );
    /*
    assert.equal(
      allRecords.objectAt(0).get('name'),
      'Braaaahm Dale',
      'the first item in the record array is Braaaahm Dale'
    );
    */

    let all = await store.findAll('person');
    // Only one record array per type should ever be created (identity map)
    assert.strictEqual(
      allRecords,
      all,
      'the same record array is returned every time all records of a type are requested'
    );
  });

  test('When all records for a type are requested, a rejection should reject the promise', async function(assert) {
    assert.expect(4);
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
              id: 1,
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
    assert.equal(
      get(all, 'length'),
      1,
      "the record array's length is 1 after a record is loaded into it"
    );
    /*
    assert.equal(
      all.objectAt(0).get('name'),
      'Braaaahm Dale',
      'the first item in the record array is Braaaahm Dale'
    );
    */
  });

  test('When all records for a type are requested, records that are already loaded should be returned immediately.', async assert => {
    assert.expect(1);

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

    assert.equal(get(allRecords, 'length'), 2, "the record array's length is 2");
    /*
    assert.equal(
      allRecords.objectAt(0).get('name'),
      'Jeremy Ashkenas',
      'the first item in the record array is Jeremy Ashkenas'
    );
    assert.equal(
      allRecords.objectAt(1).get('name'),
      'Alex MacCaw',
      'the second item in the record array is Alex MacCaw'
    );
    */
  });

  test('When all records for a type are requested, records that are created on the client should be added to the record array.', assert => {
    assert.expect(2);

    let allRecords = store.peekAll('person');

    assert.equal(
      get(allRecords, 'length'),
      0,
      "precond - the record array's length is zero before any records are loaded"
    );

    store.createRecord('person', { name: 'Carsten Nielsen' });

    assert.equal(get(allRecords, 'length'), 1, "the record array's length is 1");
    /*
    assert.equal(
      allRecords.objectAt(0).get('name'),
      'Carsten Nielsen',
      'the first item in the record array is Carsten Nielsen'
    );
    */
  });

  testInDebug('When all records are requested, assert the payload is not blank', async function(
    assert
  ) {
    let adapter = store.adapterFor('person');
    adapter.findAll = () => resolve({});

    assert.expectAssertion(() => {
      run(() => store.findAll('person'));
    }, /You made a 'findAll' request for 'person' records, but the adapter's response did not have any data/);
  });

  test('isUpdating is true while records are fetched', async function(assert) {
    let findAllDeferred = defer();
    let adapter = store.adapterFor('person');
    adapter.findAll = () => findAllDeferred.promise;
    adapter.shouldReloadAll = () => true;

    store.push({
      data: [
        {
          type: 'person',
          id: 1,
        },
      ],
    });

    let persons = store.peekAll('person');
    assert.equal(persons.get('length'), 1);

    let promise = new Promise(async resolve => {
      let persons = await store.findAll('person');

      assert.equal(persons.get('isUpdating'), false);
      assert.equal(persons.get('length'), 2);
      resolve();
    });

    assert.equal(persons.get('isUpdating'), true);

    findAllDeferred.resolve({ data: [{ id: 2, type: 'person' }] });

    await promise;
  });

  test('isUpdating is true while records are fetched in the background', async function(assert) {
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
          id: 1,
        },
      ],
    });

    let persons = store.peekAll('person');
    assert.equal(persons.get('length'), 1);

    persons = await store.findAll('person');
    assert.equal(persons.get('isUpdating'), true);
    assert.equal(persons.get('length'), 1, 'persons are updated in the background');

    assert.equal(persons.get('isUpdating'), true);

    findAllDeferred.resolve({ data: [{ id: 2, type: 'person' }] });

    await settled();

    await findAllDeferred.promise;

    assert.equal(persons.get('isUpdating'), false);
    assert.equal(persons.get('length'), 2);
  });

  test('isUpdating is false if records are not fetched in the background', async function(assert) {
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
          id: 1,
        },
      ],
    });

    let persons = store.peekAll('person');
    assert.equal(persons.get('length'), 1);

    persons = await store.findAll('person');
    assert.equal(persons.get('isUpdating'), false);
  });
});
