import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { Promise as EmberPromise, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/adapter/queries - Queries', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

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

  test('When a query is made, the adapter should receive a record array it can populate with the results of the query.', async function(assert) {
    const Person = Model.extend({ name: attr() });

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function(store, type, query, recordArray) {
      assert.equal(type, Person, 'the query method is called with the correct type');

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

    let queryResults = await store.query('person', { page: 1 });

    assert.equal(queryResults.length, 2, 'the record array has a length of 2 after the results are loaded');
    assert.equal(queryResults.isLoaded, true, "the record array's `isLoaded` property should be true");

    assert.equal(queryResults.objectAt(0).name, 'Peter Wagenet', "the first record is 'Peter Wagenet'");
    assert.equal(queryResults.objectAt(1).name, 'Brohuda Katz', "the second record is 'Brohuda Katz'");
  });

  test('a query can be updated via `update()`', async function(assert) {
    assert.expect(8);

    const Person = Model.extend();

    this.owner.register('model:person', Person);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function() {
      return resolve({ data: [{ id: 'first', type: 'person' }] });
    };

    let personsQuery = await store.query('person', {});

    assert.equal(personsQuery.length, 1, 'There is one person');
    assert.equal(personsQuery.firstObject.id, 'first', 'the right person is present');
    assert.equal(personsQuery.isUpdating, false, 'RecordArray is not updating');

    let resolveQueryPromise;

    adapter.query = function() {
      assert.ok(true, 'query is called a second time');

      return new EmberPromise(resolve => {
        resolveQueryPromise = resolve;
      });
    };

    personsQuery.update();

    assert.equal(personsQuery.isUpdating, true, 'RecordArray is updating');

    // Resolve internal promises to allow the RecordArray to build.
    await settled();

    resolveQueryPromise({ data: [{ id: 'second', type: 'person' }] });

    // Wait for all promises to resolve after the query promise resolves.
    await settled();

    assert.equal(personsQuery.isUpdating, false, 'RecordArray is not updating anymore');
    assert.equal(personsQuery.length, 1, 'There is still one person after update resolves');
    assert.equal(personsQuery.firstObject.id, 'second', 'Now it is a different person');
  });

  testInDebug('The store asserts when query is made and the adapter responses with a single record.', async function(
    assert
  ) {
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

    await assert.expectAssertion(async () => {
      await store.query('person', { page: 1 });
    }, /The response to store.query is expected to be an array but it was a single record/);
  });
});
