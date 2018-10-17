import { reject, resolve, defer } from 'rsvp';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';
import DS from 'ember-data';
import { setupTest } from 'ember-qunit';
import Model from 'ember-data/model';

const { attr } = DS;

module('integration/adapter/find-all - Finding All Records of a Type', function(hooks) {
  setupTest(hooks);

  let Person, store;

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('serializer:application', DS.JSONAPISerializer.extend());
    Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });
    Person.reopenClass({
      toString() {
        return 'Person';
      },
    });
    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test("When all records for a type are requested, the store should call the adapter's `findAll` method.", function(assert) {
    assert.expect(5);

    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        findAll() {
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
        },
      })
    );

    return run(() => {
      return store.findAll('person').then(all => {
        let allRecords = all;
        assert.equal(
          get(all, 'length'),
          1,
          "the record array's length is 1 after a record is loaded into it"
        );
        assert.equal(
          all.objectAt(0).get('name'),
          'Braaaahm Dale',
          'the first item in the record array is Braaaahm Dale'
        );

        return store.findAll('person').then(all => {
          // Only one record array per type should ever be created (identity map)
          assert.strictEqual(
            allRecords,
            all,
            'the same record array is returned every time all records of a type are requested'
          );
        });
      });
    });
  });

  test('When all records for a type are requested, a rejection should reject the promise', function(assert) {
    assert.expect(5);

    let count = 0;
    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        findAll() {
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
        },
      })
    );

    return run(() => {
      return store
        .findAll('person')
        .catch(() => {
          assert.ok(true, 'The rejection should get here');
          return store.findAll('person');
        })
        .then(all => {
          assert.equal(
            get(all, 'length'),
            1,
            "the record array's length is 1 after a record is loaded into it"
          );
          assert.equal(
            all.objectAt(0).get('name'),
            'Braaaahm Dale',
            'the first item in the record array is Braaaahm Dale'
          );
        });
    });
  });

  test('When all records for a type are requested, records that are already loaded should be returned immediately.', function(assert) {
    assert.expect(3);
    this.owner.register('adapter:application', DS.Adapter.extend());

    run(() => {
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
    });

    let allRecords = store.peekAll('person');

    assert.equal(get(allRecords, 'length'), 2, "the record array's length is 2");
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
  });

  test('When all records for a type are requested, records that are created on the client should be added to the record array.', function(assert) {
    assert.expect(3);
    this.owner.register('adapter:application', DS.Adapter.extend());

    let allRecords = store.peekAll('person');

    assert.equal(
      get(allRecords, 'length'),
      0,
      "precond - the record array's length is zero before any records are loaded"
    );

    store.createRecord('person', { name: 'Carsten Nielsen' });

    assert.equal(get(allRecords, 'length'), 1, "the record array's length is 1");
    assert.equal(
      allRecords.objectAt(0).get('name'),
      'Carsten Nielsen',
      'the first item in the record array is Carsten Nielsen'
    );
  });

  testInDebug('When all records are requested, assert the payload is not blank', function(assert) {
    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        findAll: () => resolve({}),
      })
    );

    assert.expectAssertion(() => {
      run(() => store.findAll('person'));
    }, /You made a 'findAll' request for 'person' records, but the adapter's response did not have any data/);
  });

  test('isUpdating is true while records are fetched', function(assert) {
    let findAllDeferred = defer();
    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        findAll() {
          return findAllDeferred.promise;
        },

        shouldReloadAll: () => true,
      })
    );

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: 1,
          },
        ],
      });
    });

    let persons = store.peekAll('person');
    assert.equal(persons.get('length'), 1);

    let wait = run(() => {
      return store.findAll('person').then(persons => {
        assert.equal(persons.get('isUpdating'), false);
        assert.equal(persons.get('length'), 2);
      });
    });

    assert.equal(persons.get('isUpdating'), true);

    findAllDeferred.resolve({ data: [{ id: 2, type: 'person' }] });

    return wait;
  });

  test('isUpdating is true while records are fetched in the background', function(assert) {
    let findAllDeferred = defer();
    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        findAll() {
          return findAllDeferred.promise;
        },

        shouldReloadAll() {
          return false;
        },
        shouldBackgroundReloadAll() {
          return true;
        },
      })
    );

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: 1,
          },
        ],
      });
    });

    let persons = store.peekAll('person');
    assert.equal(persons.get('length'), 1);

    return run(() => {
      return store.findAll('person').then(persons => {
        assert.equal(persons.get('isUpdating'), true);
        assert.equal(persons.get('length'), 1, 'persons are updated in the background');
      });
    }).then(() => {
      assert.equal(persons.get('isUpdating'), true);

      run(() => {
        findAllDeferred.resolve({ data: [{ id: 2, type: 'person' }] });
      });

      return run(() => {
        return findAllDeferred.promise.then(() => {
          assert.equal(persons.get('isUpdating'), false);
          assert.equal(persons.get('length'), 2);
        });
      });
    });
  });

  test('isUpdating is false if records are not fetched in the background', function(assert) {
    let findAllDeferred = defer();
    this.owner.register(
      'adapter:person',
      DS.Adapter.extend({
        findAll() {
          return findAllDeferred.promise;
        },
        shouldReloadAll: () => false,
        shouldBackgroundReloadAll: () => false,
      })
    );

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: 1,
          },
        ],
      });
    });

    let persons = store.peekAll('person');
    assert.equal(persons.get('length'), 1);

    return run(() => {
      return store.findAll('person').then(persons => {
        assert.equal(persons.get('isUpdating'), false);
      });
    }).then(() => {
      assert.equal(persons.get('isUpdating'), false);
    });
  });
});
