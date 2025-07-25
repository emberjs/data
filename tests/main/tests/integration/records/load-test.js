import EmberObject from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

function _isLoading(cache, identifier) {
  const req = cache.store.getRequestStateService();
  const fulfilled = req.getLastRequestForRecord(identifier);
  const isLoaded = cache.recordIsLoaded(identifier);

  return (
    !isLoaded && fulfilled === null && req.getPendingRequestsForRecord(identifier).some((req) => req.type === 'query')
  );
}

class Person extends Model {
  @attr()
  name;

  @attr lastName;
  @attr firstName;

  @belongsTo('person', { async: true, inverse: 'bestFriend' })
  bestFriend;
}

module('integration/load - Loading Records', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test('Preload works as expected', async function (assert) {
    this.owner.register(
      'adapter:application',
      class extends EmberObject {
        findRecord() {
          return Promise.resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris',
                lastName: 'Thoburn',
              },
            },
          });
        }
      }
    );
    const promise = store.findRecord('person', '1', {
      preload: {
        name: '@runspired',
        firstName: 'James',
      },
    });
    const person = store.peekRecord('person', '1');
    assert.strictEqual(person.name, '@runspired', 'name correct on preload');
    assert.strictEqual(person.firstName, 'James', 'firstName correct on preload');

    await promise;
    assert.strictEqual(person.name, 'Chris', 'name correct on load');
    assert.strictEqual(person.firstName, 'James', 'firstName correct on load');
    assert.strictEqual(person.lastName, 'Thoburn', 'lastName correct on load');
  });

  test('Preload works even when the record is loaded', async function (assert) {
    this.owner.register(
      'adapter:application',
      class extends EmberObject {
        findRecord() {
          return Promise.resolve({
            data: {
              type: 'person',
              id: '1',
              attributes: {
                name: 'Chris',
                lastName: 'Thoburn',
              },
            },
          });
        }
      }
    );
    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Wes',
          firstName: 'Wesley',
          lastName: 'Youman',
        },
      },
    });
    const promise = store.findRecord('person', '1', {
      reload: true,
      preload: {
        name: '@runspired',
        firstName: 'James',
      },
    });
    assert.strictEqual(person.name, '@runspired', 'name correct on preload');
    assert.strictEqual(person.firstName, 'James', 'firstName correct on preload');
    assert.strictEqual(person.lastName, 'Youman', 'lastName correct on preload');

    await promise;
    assert.strictEqual(person.name, 'Chris', 'name correct on load');
    assert.strictEqual(person.firstName, 'James', 'firstName correct on load');
    assert.strictEqual(person.lastName, 'Thoburn', 'lastName correct on load');
  });

  test('When loading a record fails, the record is not left behind', async function (assert) {
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return Promise.reject();
        },
      })
    );

    await store.findRecord('person', '1').catch(() => {
      assert.strictEqual(store.peekRecord('person', '1'), null);
    });
  });

  testInDebug('When findRecord returns null data a meaningful error is thrown', async function (assert) {
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return Promise.resolve({ data: null });
        },
      })
    );
    this.owner.register('serializer:application', JSONAPISerializer);

    try {
      await store.findRecord('person', '1');
      assert.ok(false, 'We should throw an error');
    } catch (e) {
      assert.strictEqual(
        e.message,
        `The 'findRecord' request for person:1 resolved indicating success but contained no primary data. To indicate a 404 not found you should either reject the promise returned by the adapter's findRecord method or throw a NotFoundError.`,
        'we throw a meaningful error'
      );
    }
  });

  test('Empty records remain in the empty state while data is being fetched', async function (assert) {
    const payloads = [
      {
        data: {
          type: 'person',
          id: '1',
          attributes: { name: 'Chris' },
          relationships: {
            bestFriend: {
              data: { type: 'person', id: '2' },
            },
          },
        },
        included: [
          {
            type: 'person',
            id: '2',
            attributes: { name: 'Shen' },
            relationships: {
              bestFriend: {
                data: { type: 'person', id: '1' },
              },
            },
          },
        ],
      },
      {
        data: {
          type: 'person',
          id: '1',
          attributes: { name: 'Chris' },
          relationships: {
            bestFriend: {
              data: { type: 'person', id: '2' },
            },
          },
        },
      },
      {
        data: {
          type: 'person',
          id: '1',
          attributes: { name: 'Chris' },
          relationships: {
            bestFriend: {
              data: { type: 'person', id: '2' },
            },
          },
        },
      },
    ];

    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          const payload = payloads.shift();

          if (payload === undefined) {
            return Promise.reject(new Error('Invalid Request'));
          }

          return Promise.resolve(payload);
        },
      })
    );
    this.owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, data) {
          return data;
        },
      })
    );

    const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    const instanceCache = store._instanceCache;
    let cache = store.cache;

    // test that our initial state is correct
    assert.false(_isLoading(instanceCache, identifier), 'We have not triggered a load');

    let recordPromise = store.findRecord('person', '1');

    // test that during the initial load our state is correct
    assert.true(_isLoading(instanceCache, identifier), 'awaiting first fetch: We have now triggered a load');

    const record = await recordPromise;

    // test that after the initial load our state is correct
    cache = store.cache;
    assert.false(cache.isEmpty(identifier), 'after first fetch: We are no longer empty');
    assert.false(_isLoading(instanceCache, identifier), 'after first fetch: We have loaded');
    assert.false(record.isReloading, 'after first fetch: We are not reloading');

    const bestFriend = await record.bestFriend;
    const trueBestFriend = await bestFriend.bestFriend;

    // shen is our retainer for the record we are testing
    //  that ensures unloadRecord later in this test does not fully
    //  discard the identifier
    const shen = store.peekRecord('person', '2');

    assert.strictEqual(bestFriend, shen, 'Precond: bestFriend is correct');
    assert.strictEqual(trueBestFriend, record, 'Precond: bestFriend of bestFriend is correct');

    recordPromise = record.reload();

    // test that during a reload our state is correct
    assert.false(cache.isEmpty(identifier), 'awaiting reload: We remain non-empty');
    assert.false(_isLoading(instanceCache, identifier), 'awaiting reload: We are not loading again');
    assert.true(record.isReloading, 'awaiting reload: We are reloading');

    await recordPromise;

    // test that after a reload our state is correct
    assert.false(cache.isEmpty(identifier), 'after reload: We remain non-empty');
    assert.false(_isLoading(instanceCache, identifier), 'after reload: We have loaded');
    assert.false(record.isReloading, 'after reload:: We are not reloading');

    record.unloadRecord();
    await settled();

    // test that after an unload our state is correct
    assert.true(cache.isEmpty(identifier), 'after unload: We are empty again');
    assert.false(_isLoading(instanceCache, identifier), 'after unload: We are not loading');
    assert.false(record.isReloading, 'after unload:: We are not reloading');

    recordPromise = store.findRecord('person', '1');

    // test that during a reload-due-to-unload our state is correct
    //   This requires a retainer (the async bestFriend relationship)
    assert.true(cache.isEmpty(identifier), 'awaiting second find: We remain empty');
    assert.true(_isLoading(instanceCache, identifier), 'awaiting second find: We are loading again');
    assert.false(record.isReloading, 'awaiting second find: We are not reloading');

    await recordPromise;

    // test that after the reload-due-to-unload our state is correct
    assert.false(cache.isEmpty(identifier), 'after second find: Our resource data is no longer empty');
    assert.false(_isLoading(instanceCache, identifier), 'after second find: We have loaded');
    assert.false(record.isReloading, 'after second find: We are not reloading');
  });
});
