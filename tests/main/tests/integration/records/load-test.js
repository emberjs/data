import EmberObject from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
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
    let { owner } = this;
    owner.register('service:store', Store);
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
          return reject();
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
          return resolve({ data: null });
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
        `Assertion Failed: The 'findRecord' request for person:1 resolved indicating success but contained no primary data. To indicate a 404 not found you should either reject the promise returned by the adapter's findRecord method or throw a NotFoundError.`,
        'we throw a meaningful error'
      );
    }
  });

  test('Empty records remain in the empty state while data is being fetched', async function (assert) {
    let payloads = [
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
          let payload = payloads.shift();

          if (payload === undefined) {
            return reject(new Error('Invalid Request'));
          }

          return resolve(payload);
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

    let identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    let cache = store._instanceCache;
    let recordData = cache.peek({ identifier, bucket: 'recordData' });

    // test that our initial state is correct
    assert.strictEqual(recordData, undefined, 'We begin in the empty state');
    assert.false(_isLoading(cache, identifier), 'We have not triggered a load');

    let recordPromise = store.findRecord('person', '1');

    // test that during the initial load our state is correct
    recordData = cache.peek({ identifier, bucket: 'recordData' });
    assert.strictEqual(recordData, undefined, 'awaiting first fetch: We remain in the empty state');
    assert.true(_isLoading(cache, identifier), 'awaiting first fetch: We have now triggered a load');

    let record = await recordPromise;

    // test that after the initial load our state is correct
    recordData = cache.peek({ identifier, bucket: 'recordData' });
    assert.false(recordData.isEmpty(identifier), 'after first fetch: We are no longer empty');
    assert.false(_isLoading(cache, identifier), 'after first fetch: We have loaded');
    assert.false(record.isReloading, 'after first fetch: We are not reloading');

    let bestFriend = await record.bestFriend;
    let trueBestFriend = await bestFriend.bestFriend;

    // shen is our retainer for the record we are testing
    //  that ensures unloadRecord later in this test does not fully
    //  discard the identifier
    let shen = store.peekRecord('person', '2');

    assert.strictEqual(bestFriend, shen, 'Precond: bestFriend is correct');
    assert.strictEqual(trueBestFriend, record, 'Precond: bestFriend of bestFriend is correct');

    recordPromise = record.reload();

    // test that during a reload our state is correct
    assert.false(recordData.isEmpty(identifier), 'awaiting reload: We remain non-empty');
    assert.false(_isLoading(cache, identifier), 'awaiting reload: We are not loading again');
    assert.true(record.isReloading, 'awaiting reload: We are reloading');

    await recordPromise;

    // test that after a reload our state is correct
    assert.false(recordData.isEmpty(identifier), 'after reload: We remain non-empty');
    assert.false(_isLoading(cache, identifier), 'after reload: We have loaded');
    assert.false(record.isReloading, 'after reload:: We are not reloading');

    run(() => record.unloadRecord());

    // test that after an unload our state is correct
    assert.true(recordData.isEmpty(identifier), 'after unload: We are empty again');
    assert.false(_isLoading(cache, identifier), 'after unload: We are not loading');
    assert.false(record.isReloading, 'after unload:: We are not reloading');

    recordPromise = store.findRecord('person', '1');

    // test that during a reload-due-to-unload our state is correct
    //   This requires a retainer (the async bestFriend relationship)
    assert.true(recordData.isEmpty(identifier), 'awaiting second find: We remain empty');
    let newRecordData = cache.peek({ identifier, bucket: 'recordData' });
    assert.strictEqual(newRecordData, undefined, 'We have no recordData during second find');
    assert.true(_isLoading(cache, identifier), 'awaiting second find: We are loading again');
    assert.false(record.isReloading, 'awaiting second find: We are not reloading');

    await recordPromise;

    // test that after the reload-due-to-unload our state is correct
    newRecordData = cache.peek({ identifier, bucket: 'recordData' });
    assert.false(recordData.isEmpty(identifier), 'after second find: Our original recordData is no longer empty');

    assert.false(newRecordData.isEmpty(identifier), 'after second find: We are no longer empty');
    assert.false(_isLoading(cache, identifier), 'after second find: We have loaded');
    assert.false(record.isReloading, 'after second find: We are not reloading');
  });
});
