import { Promise as EmberPromise, resolve } from 'rsvp';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import { setupTest } from 'ember-qunit';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';

import DS from 'ember-data';

module('integration/adapter/queries - Queries', function(hooks) {
  setupTest(hooks);

  let store, adapter;

  hooks.beforeEach(function() {
    const Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
    });
    let { owner } = this;

    owner.register('model:person', Person);
    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  testInDebug('It raises an assertion when no type is passed', function(assert) {
    assert.expectAssertion(() => {
      store.query();
    }, "You need to pass a model name to the store's query method");
  });

  testInDebug('It raises an assertion when no query hash is passed', function(assert) {
    assert.expectAssertion(() => {
      store.query('person');
    }, "You need to pass a query hash to the store's query method");
  });

  test('When a query is made, the adapter should receive a record array it can populate with the results of the query.', function(assert) {
    adapter.query = function(store, type, query, recordArray) {
      const Person = store.modelFor('person');
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
      assert.equal(
        get(queryResults, 'length'),
        2,
        'the record array has a length of 2 after the results are loaded'
      );
      assert.equal(
        get(queryResults, 'isLoaded'),
        true,
        "the record array's `isLoaded` property should be true"
      );

      assert.equal(
        queryResults.objectAt(0).get('name'),
        'Peter Wagenet',
        "the first record is 'Peter Wagenet'"
      );
      assert.equal(
        queryResults.objectAt(1).get('name'),
        'Brohuda Katz',
        "the second record is 'Brohuda Katz'"
      );
    });
  });

  test('a query can be updated via `update()`', function(assert) {
    adapter.query = function() {
      return resolve({ data: [{ id: 'first', type: 'person' }] });
    };

    return run(() => {
      return store
        .query('person', {})
        .then(query => {
          assert.equal(query.get('length'), 1);
          assert.equal(query.get('firstObject.id'), 'first');
          assert.equal(query.get('isUpdating'), false);

          adapter.query = function() {
            assert.ok('query is called a second time');
            return resolve({ data: [{ id: 'second', type: 'person' }] });
          };

          let updateQuery = query.update();

          assert.equal(query.get('isUpdating'), true);

          return updateQuery;
        })
        .then(query => {
          assert.equal(query.get('length'), 1);
          assert.equal(query.get('firstObject.id'), 'second');

          assert.equal(query.get('isUpdating'), false);
        });
    });
  });

  testInDebug(
    'The store asserts when query is made and the adapter responses with a single record.',
    function(assert) {
      this.owner.register('adapter:person', DS.RESTAdapter.extend());
      adapter = store.adapterFor('person');
      adapter.query = function(store, type, query, recordArray) {
        const Person = store.modelFor('person');
        assert.equal(type, Person, 'the query method is called with the correct type');

        return resolve({ data: [{ id: 1, type: 'person', attributes: { name: 'Peter Wagenet' } }] });
      };

      assert.expectAssertion(() => {
        run(() => store.query('person', { page: 1 }));
      }, /The response to store.query is expected to be an array but it was a single record/);
    }
  );

});
