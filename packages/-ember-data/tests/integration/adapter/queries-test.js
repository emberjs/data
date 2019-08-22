import { Promise as EmberPromise, resolve } from 'rsvp';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { setupTest } from 'ember-qunit';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import Model, { attr } from '@ember-data/model';

module('integration/adapter/queries - Queries', function(hooks) {
  setupTest(hooks);

  testInDebug('It raises an assertion when no type is passed', function(assert) {
    const Person = Model.extend();

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      store.query();
    }, "You need to pass a model name to the store's query method");
  });

  testInDebug('It raises an assertion when no query hash is passed', function(assert) {
    const Person = Model.extend();

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      store.query('person');
    }, "You need to pass a query hash to the store's query method");
  });

  test('When a query is made, the adapter should receive a record array it can populate with the results of the query.', function(assert) {
    const Person = Model.extend({ name: attr() });

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function(store, type, query, recordArray) {
      assert.equal(type, Person, 'the query method is called with the correct type');

      return EmberPromise.resolve({
        data: [
          {
            id: 1,
            type: 'person',
            attributes: {
              name: 'Peter Wagenet',
            },
          },
          {
            id: 2,
            type: 'person',
            attributes: {
              name: 'Brohuda Katz',
            },
          },
        ],
      });
    };

    return store.query('person', { page: 1 }).then(queryResults => {
      assert.equal(get(queryResults, 'length'), 2, 'the record array has a length of 2 after the results are loaded');
      assert.equal(get(queryResults, 'isLoaded'), true, "the record array's `isLoaded` property should be true");

      assert.equal(queryResults.objectAt(0).get('name'), 'Peter Wagenet', "the first record is 'Peter Wagenet'");
      assert.equal(queryResults.objectAt(1).get('name'), 'Brohuda Katz', "the second record is 'Brohuda Katz'");
    });
  });

  test('a query can be updated via `update()`', function(assert) {
    const Person = Model.extend();

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function() {
      return resolve({ data: [{ id: 'first', type: 'person' }] });
    };

    return run(() => {
      return store
        .query('person', {})
        .then(query => {
          assert.equal(query.get('length'), 1, 'we have one person');
          assert.equal(query.get('firstObject.id'), 'first', 'the right person is present');
          assert.equal(query.get('isUpdating'), false, 'we are not updating');

          adapter.query = function() {
            assert.ok(true, 'query is called a second time');
            return resolve({ data: [{ id: 'second', type: 'person' }] });
          };

          let updateQuery = query.update();

          assert.equal(query.get('isUpdating'), true, 'we are updating');

          return updateQuery;
        })
        .then(query => {
          assert.equal(query.get('length'), 1, 'we still have one person');
          assert.equal(query.get('firstObject.id'), 'second', 'now it is a different person');

          assert.equal(query.get('isUpdating'), false, 'we are no longer updating');
        });
    });
  });

  testInDebug('The store asserts when query is made and the adapter responses with a single record.', function(assert) {
    const Person = Model.extend({ name: attr() });

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function(store, type, query, recordArray) {
      assert.equal(type, Person, 'the query method is called with the correct type');

      return resolve({
        data: { id: 1, type: 'person', attributes: { name: 'Peter Wagenet' } },
      });
    };

    assert.expectAssertion(() => {
      run(() => store.query('person', { page: 1 }));
    }, /The response to store.query is expected to be an array but it was a single record/);
  });
});
