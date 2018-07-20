import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { reject, Promise } from 'rsvp';
import Store from 'ember-data/store';
import Model from 'ember-data/model';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import { attr, belongsTo } from '@ember-decorators/data';

class Person extends Model {
  @attr name;
  @belongsTo('person', { async: true, inverse: 'bestFriend' })
  bestFriend;
}

import { run } from '@ember/runloop';

module('integration/load - Loading Records', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    store = owner.lookup('service:store');
  });

  test('When loading a record fails, the record is not left behind', async function(assert) {
    this.owner.register('adapter:application', JSONAPIAdapter.extend({
      findRecord() {
        return reject();
      }
    }));

    await store.findRecord('person', '1')
      .catch(() => {
        assert.equal(store.hasRecordForId('person', '1'), false);
      });
  });

  test('Empty records remain in the empty state while data is being fetched', async function(assert) {
    let deferredResolve;

    this.owner.register('adapter:application', JSONAPIAdapter.extend({
      findRecord() {
        return new Promise(resolve => {
          deferredResolve = resolve;
        })
      }
    }));

    let internalModel = store._internalModelForId('person', '1');

    // test that our initial state is correct
    assert.equal(internalModel.isEmpty(), true, 'We begin in the empty state');
    assert.equal(internalModel.isLoading(), false, 'We have not triggered a load');

    let recordPromise = store.findRecord('person', '1');

    // test that during the initial load our state is correct
    assert.equal(internalModel.isEmpty(), true, 'We remain in the empty state');
    assert.equal(internalModel.isLoading(), true, 'We have now triggered a load');

    deferredResolve({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          bestFriend: {
            data: { type: 'person', id: '2' }
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '2',
          attributes: { name: 'Shen' },
          relationships: {
            bestFriend: {
              data: { type: 'person', id: '1' }
            }
          }
        }
      ]
    });

    let record = await recordPromise;

    // test that after the initial load our state is correct
    assert.equal(internalModel.isEmpty(), false, 'We are no longer empty');
    assert.equal(internalModel.isLoading(), false, 'We have loaded');

    let bestFriend = await record.get('bestFriend');
    let trueBestFriend = await bestFriend.get('bestFriend');
    let shen = store.peekRecord('person', '2');

    assert.ok(bestFriend === shen, 'Precond: bestFriend is correct');
    assert.ok(trueBestFriend === record, 'Precond: bestFriend of bestFriend is correct');

    recordPromise = record.reload();

    // test that during a reload our state is correct
    assert.equal(internalModel.isEmpty(), false, 'We remain non-empty');
    assert.equal(internalModel.isLoading(), true, 'We are loading again');

    await recordPromise;

    // test that after a reload our state is correct
    assert.equal(internalModel.isEmpty(), false, 'We remain non-empty');
    assert.equal(internalModel.isLoading(), false, 'We have loaded');

    await record.unloadRecord();

    // test that after an unload our state is correct
    assert.equal(internalModel.isEmpty(), false, 'We are empty again');
    assert.equal(internalModel.isLoading(), false, 'We are not loading');

    recordPromise = store.findRecord('person', '1');

    // test that during a reload-due-to-unload our state is correct
    //   This requires a retainer (the async bestFriend relationship)
    assert.equal(internalModel.isEmpty(), true, 'We remain empty');
    assert.equal(internalModel.isLoading(), true, 'We are loading again');

    deferredResolve({
      data: {
        type: 'person',
        id: '1',
        attributes: { name: 'Chris' },
        relationships: {
          bestFriend: {
            data: { type: 'person', id: '2' }
          }
        }
      }
    });

    await recordPromise;

    // test that after the reload-due-to-unload our state is correct
    assert.equal(internalModel.isEmpty(), false, 'We are no longer empty');
    assert.equal(internalModel.isLoading(), false, 'We have loaded');
  });
});
