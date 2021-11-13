import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import todo from '@ember-data/unpublished-test-infra/test-support/todo';

class Person extends Model {
  @attr()
  name;

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
      assert.false(store.hasRecordForId('person', '1'));
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

  todo('Empty records remain in the empty state while data is being fetched', async function (assert) {
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

    let internalModel = store._internalModelForId('person', '1');

    // test that our initial state is correct
    assert.strictEqual(internalModel.currentState.isEmpty, true, 'We begin in the empty state');
    assert.strictEqual(internalModel.currentState.isLoading, false, 'We have not triggered a load');

    let recordPromise = store.findRecord('person', '1');

    // test that during the initial load our state is correct
    assert.todo.equal(internalModel.currentState.isEmpty, true, 'awaiting first fetch: We remain in the empty state');
    assert.strictEqual(
      internalModel.currentState.isLoading,
      true,
      'awaiting first fetch: We have now triggered a load'
    );

    let record = await recordPromise;

    // test that after the initial load our state is correct
    assert.strictEqual(internalModel.currentState.isEmpty, false, 'after first fetch: We are no longer empty');
    assert.strictEqual(internalModel.currentState.isLoading, false, 'after first fetch: We have loaded');
    assert.strictEqual(record.isReloading, false, 'after first fetch: We are not reloading');

    let bestFriend = await record.get('bestFriend');
    let trueBestFriend = await bestFriend.get('bestFriend');

    // shen is our retainer for the record we are testing
    //  that ensures unloadRecord later in this test does not fully
    //  discard the internalModel
    let shen = store.peekRecord('person', '2');

    assert.ok(bestFriend === shen, 'Precond: bestFriend is correct');
    assert.ok(trueBestFriend === record, 'Precond: bestFriend of bestFriend is correct');

    recordPromise = record.reload();

    // test that during a reload our state is correct
    assert.strictEqual(internalModel.currentState.isEmpty, false, 'awaiting reload: We remain non-empty');
    assert.strictEqual(internalModel.currentState.isLoading, false, 'awaiting reload: We are not loading again');
    assert.strictEqual(record.isReloading, true, 'awaiting reload: We are reloading');

    await recordPromise;

    // test that after a reload our state is correct
    assert.strictEqual(internalModel.currentState.isEmpty, false, 'after reload: We remain non-empty');
    assert.strictEqual(internalModel.currentState.isLoading, false, 'after reload: We have loaded');
    assert.strictEqual(record.isReloading, false, 'after reload:: We are not reloading');

    run(() => record.unloadRecord());

    // test that after an unload our state is correct
    assert.strictEqual(internalModel.currentState.isEmpty, true, 'after unload: We are empty again');
    assert.strictEqual(internalModel.currentState.isLoading, false, 'after unload: We are not loading');
    assert.strictEqual(record.isReloading, false, 'after unload:: We are not reloading');

    recordPromise = store.findRecord('person', '1');

    // test that during a reload-due-to-unload our state is correct
    //   This requires a retainer (the async bestFriend relationship)
    assert.todo.equal(internalModel.currentState.isEmpty, true, 'awaiting second find: We remain empty');
    assert.strictEqual(internalModel.currentState.isLoading, true, 'awaiting second find: We are loading again');
    assert.strictEqual(record.isReloading, false, 'awaiting second find: We are not reloading');

    await recordPromise;

    // test that after the reload-due-to-unload our state is correct
    assert.strictEqual(internalModel.currentState.isEmpty, false, 'after second find: We are no longer empty');
    assert.strictEqual(internalModel.currentState.isLoading, false, 'after second find: We have loaded');
    assert.strictEqual(record.isReloading, false, 'after second find: We are not reloading');
  });
});
