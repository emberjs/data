import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';

class Person extends Model {
  @attr()
  name;

  @belongsTo('person', { async: true, inverse: 'bestFriend' })
  bestFriend;
}

module('integration/load - Loading Records', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test('When loading a record fails, the record is not left behind', async function(assert) {
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

  test('Empty records remain in the empty state while data is being fetched', async function(assert) {
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
    assert.true(internalModel.currentState.isEmpty, 'We begin in the empty state');
    assert.false(internalModel.currentState.isLoading, 'We have not triggered a load');
    assert.false(internalModel.isReloading, 'We are not reloading');

    let recordPromise = store.findRecord('person', '1');

    // test that during the initial load our state is correct
    assert.true(internalModel.currentState.isEmpty, 'awaiting first fetch: We remain in the empty state');
    assert.true(internalModel.currentState.isLoading, 'awaiting first fetch: We have now triggered a load');
    assert.false(internalModel.isReloading, 'awaiting first fetch: We are not reloading');

    let record = await recordPromise;

    // test that after the initial load our state is correct
    assert.false(internalModel.currentState.isEmpty, 'after first fetch: We are no longer empty');
    assert.false(internalModel.currentState.isLoading, 'after first fetch: We have loaded');
    assert.false(internalModel.isReloading, 'after first fetch: We are not reloading');

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
    assert.false(internalModel.currentState.isEmpty, 'awaiting reload: We remain non-empty');
    assert.false(internalModel.currentState.isLoading, 'awaiting reload: We are not loading again');
    assert.true(internalModel.isReloading, 'awaiting reload: We are reloading');

    await recordPromise;

    // test that after a reload our state is correct
    assert.false(internalModel.currentState.isEmpty, 'after reload: We remain non-empty');
    assert.false(internalModel.currentState.isLoading, 'after reload: We have loaded');
    assert.false(internalModel.isReloading, 'after reload:: We are not reloading');

    run(() => record.unloadRecord());

    // test that after an unload our state is correct
    assert.true(internalModel.currentState.isEmpty, 'after unload: We are empty again');
    assert.false(internalModel.currentState.isLoading, 'after unload: We are not loading');
    assert.false(internalModel.isReloading, 'after unload:: We are not reloading');

    recordPromise = store.findRecord('person', '1');

    // test that during a reload-due-to-unload our state is correct
    //   This requires a retainer (the async bestFriend relationship)
    assert.true(internalModel.currentState.isEmpty, 'awaiting second find: We remain empty');
    assert.true(internalModel.currentState.isLoading, 'awaiting second find: We are loading again');
    assert.false(internalModel.isReloading, 'awaiting second find: We are not reloading');

    await recordPromise;

    // test that after the reload-due-to-unload our state is correct
    assert.false(internalModel.currentState.isEmpty, 'after second find: We are no longer empty');
    assert.false(internalModel.currentState.isLoading, 'after second find: We have loaded');
    assert.false(internalModel.isReloading, 'after second find: We are not reloading');
  });

  test('Preloaded records do not remain in the empty state while data is being fetched', async function(assert) {
    let payloads = [
      {
        data: {
          type: 'person',
          id: '1',
          attributes: { name: 'Chris' },
          relationships: {},
        },
        included: [],
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
    assert.true(internalModel.currentState.isEmpty, 'We begin in the empty state');
    assert.false(internalModel.currentState.isLoading, 'We have not triggered a load');
    assert.false(internalModel.isReloading, 'We are not reloading');

    let recordPromise = store.findRecord('person', '1', { preload: { name: 'Chris' } });

    // test that during the initial load our state is correct
    assert.false(internalModel.currentState.isEmpty, 'awaiting first fetch: We are no longer in the empty state');
    assert.true(internalModel.currentState.isPreloaded, 'awaiting first fetch: We are in a preloaded state');
    assert.true(internalModel.currentState.isLoading, 'awaiting first fetch: We have now triggered a load');
    assert.false(internalModel.isReloading, 'awaiting first fetch: We are not reloading');

    await recordPromise;

    // test that after the initial load our state is correct
    assert.false(internalModel.currentState.isEmpty, 'after first fetch: We are no longer empty');
    assert.false(internalModel.currentState.isPreloaded, 'awaiting first fetch: We are no longer in a preloaded state');
    assert.false(internalModel.currentState.isLoading, 'after first fetch: We have loaded');
    assert.false(internalModel.isReloading, 'after first fetch: We are not reloading');
  });
});
