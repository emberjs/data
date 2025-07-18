import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { createDeferred } from '@ember-data/request';
import type { LegacyQueryArray, Store } from '@ember-data/store/-private';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Tag extends Model {
  @attr declare name: string;
}

module('unit/record-arrays/legacy-query-array', function (hooks) {
  setupTest(hooks);

  test('default initial state', async function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const adapter = store.adapterFor('application');
    const inQuery = createDeferred();
    const deferred = createDeferred();
    adapter.query = (...args: unknown[]) => {
      inQuery.resolve(args);
      return deferred.promise;
    };
    const MyQuery = {};
    const MyMeta = {};
    const MyLinks = {};
    const queryPromise = store.query('tag', MyQuery);
    const adapterArgs = (await inQuery.promise) as unknown[];
    assert.strictEqual(adapterArgs[2], MyQuery);
    const unloadedQuery = adapterArgs[3] as LegacyQueryArray;
    assert.false(unloadedQuery.isLoaded, 'we are not loaded yet');
    assert.strictEqual(unloadedQuery.modelName, 'tag', 'we have our modelName');
    assert.strictEqual(unloadedQuery.query, MyQuery, 'we have our query');
    assert.strictEqual(unloadedQuery.links, null, 'we have no links');
    assert.strictEqual(unloadedQuery.meta, null, 'we have no meta');
    assert.deepEqual(unloadedQuery.slice(), [], 'we have no content');
    deferred.resolve({
      meta: MyMeta,
      links: MyLinks,
      data: [
        {
          type: 'tag',
          id: '1',
          attributes: { name: 'Hanes' },
        },
      ],
    });
    const query = await queryPromise;
    const tag = store.peekRecord('tag', '1');

    assert.true(query.isLoaded, 'expected the query to be loaded');
    assert.strictEqual(query.modelName, 'tag', 'has modelName');
    assert.deepEqual(query.slice(), [tag], 'has content');
    assert.strictEqual(query.query, MyQuery, 'has query');
    assert.strictEqual(query.links, MyLinks, 'has links');
    assert.strictEqual(query.meta, MyMeta, 'has meta');
  });

  testInDebug('mutation throws error', async function (assert) {
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const adapter = store.adapterFor('application');
    adapter.query = (..._args: unknown[]) => {
      return {
        data: [
          {
            type: 'tag',
            id: '1',
            attributes: { name: 'Hanes' },
          },
        ],
      };
    };
    const queryArray = await store.query('tag', {});

    assert.throws(
      () => {
        queryArray.splice(0, 1);
      },
      Error('Mutating this array of records via splice is not allowed.'),
      'throws error'
    );
  });

  test('#update uses _update enabling query specific behavior', async function (assert) {
    let queryCalled = 0;
    this.owner.register('model:tag', Tag);
    const store = this.owner.lookup('service:store') as Store;
    const adapter = store.adapterFor('application');
    const deferred = createDeferred();
    adapter.query = (..._args: unknown[]) => {
      if (queryCalled) {
        queryCalled++;
        return deferred.promise;
      }
      queryCalled++;
      return Promise.resolve({
        data: [],
      });
    };

    const queryArray = await store.query('tag', {});

    assert.false(queryArray.isUpdating, 'should not yet be updating');

    assert.strictEqual(queryCalled, 1);

    const updateResult = queryArray.update();

    assert.true(queryArray.isUpdating, 'should be updating');
    deferred.resolve({
      data: [
        {
          type: 'tag',
          id: '1',
          attributes: { name: 'Hanes' },
        },
      ],
    });

    const result = await updateResult;

    assert.strictEqual(queryCalled, 2);
    assert.strictEqual(result, queryArray);
    assert.strictEqual(queryArray.length, 1, 'we updated');
    assert.false(queryArray.isUpdating, 'should no longer be updating');
  });
});
