import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { Promise as EmberPromise, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/adapter/queries - Queries', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  testInDebug('It raises an assertion when no type is passed', function (assert) {
    class Person extends Model {}

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      store.query();
    }, "You need to pass a model name to the store's query method");
  });

  testInDebug('It raises an assertion when no query hash is passed', function (assert) {
    class Person extends Model {}

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      store.query('person');
    }, "You need to pass a query hash to the store's query method");
  });

  test('When a query is made, the adapter should receive a record array it can populate with the results of the query.', async function (assert) {
    class Person extends Model {
      @attr name;
    }

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function (store, type, query, recordArray) {
      assert.strictEqual(type, Person, 'the query method is called with the correct type');

      return EmberPromise.resolve({
        data: [
          {
            id: '1',
            type: 'person',
            attributes: {
              name: 'Peter Wagenet',
            },
          },
          {
            id: '2',
            type: 'person',
            attributes: {
              name: 'Brohuda Katz',
            },
          },
        ],
      });
    };

    let queryResults = await store.query('person', { page: '1' });

    assert.strictEqual(queryResults.length, 2, 'the record array has a length of 2 after the results are loaded');
    assert.true(queryResults.isLoaded, "the record array's `isLoaded` property should be true");

    assert.strictEqual(queryResults.at(0).name, 'Peter Wagenet', "the first record is 'Peter Wagenet'");
    assert.strictEqual(queryResults.at(1).name, 'Brohuda Katz', "the second record is 'Brohuda Katz'");
  });

  test('a query can be updated via `update()`', async function (assert) {
    assert.expect(8);

    class Person extends Model {}

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function () {
      return resolve({ data: [{ id: 'first', type: 'person' }] });
    };

    let personsQuery = await store.query('person', {});

    assert.strictEqual(personsQuery.length, 1, 'There is one person');
    assert.strictEqual(personsQuery.at(0).id, 'first', 'the right person is present');
    assert.false(personsQuery.isUpdating, 'RecordArray is not updating');

    let resolveQueryPromise;
    const deferred = new Promise((resolve) => {
      resolveQueryPromise = resolve;
    });

    adapter.query = function () {
      assert.ok(true, 'query is called a second time');

      return deferred;
    };

    personsQuery.update();

    assert.true(personsQuery.isUpdating, 'RecordArray is updating');

    resolveQueryPromise({ data: [{ id: 'second', type: 'person' }] });

    // Wait for all promises to resolve after the query promise resolves.
    // this just ensures that our waiter is waiting, we could also
    // wait the return of update.
    await settled();

    assert.false(personsQuery.isUpdating, 'RecordArray is not updating anymore');
    assert.strictEqual(personsQuery.length, 1, 'There is still one person after update resolves');
    assert.strictEqual(personsQuery.at(0).id, 'second', 'Now it is a different person');
  });

  testInDebug(
    'The store asserts when query is made and the adapter responses with a single record.',
    async function (assert) {
      class Person extends Model {
        @attr name;
      }

      this.owner.register('model:person', Person);

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.query = function (store, type, query, recordArray) {
        assert.strictEqual(type, Person, 'the query method is called with the correct type');

        return resolve({
          data: { id: '1', type: 'person', attributes: { name: 'Peter Wagenet' } },
        });
      };

      await assert.expectAssertion(async () => {
        await store.query('person', { page: '1' });
      }, /The response to store.query is expected to be an array but it was a single record/);
    }
  );
});
