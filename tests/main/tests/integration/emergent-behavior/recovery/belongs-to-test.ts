import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { DEBUG } from '@ember-data/env';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import Model, { attr, belongsTo } from '@ember-data/model';
import type Store from '@ember-data/store';
import type { ModelSchema } from '@ember-data/types/q/ds-model';

let IS_DEBUG = false;

if (DEBUG) {
  IS_DEBUG = true;
}
class User extends Model {
  @attr declare name: string;
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: User;
}

module('Emergent Behavior > Recovery | belongsTo', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);

    const store = this.owner.lookup('service:store') as Store;
    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris Wagenet',
        },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
    });
  });

  test('When a sync relationship is accessed before load', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.peekRecord('user', '1') as unknown as User;

    assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

    // access the relationship before load
    try {
      const bestFriend = user.bestFriend;

      // in IS_DEBUG we error and should not reach here
      assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
      assert.true(bestFriend.isEmpty, 'the relationship is empty');
      assert.strictEqual(bestFriend.id, '2', 'the relationship id is present');
      assert.strictEqual(store.peekRecord('user', '2'), null, 'the related record is not in the store');
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
      assert.strictEqual(store.peekRecord('user', '2'), null, 'the related record is not in the store');
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');
    }
  });

  test('When a sync relationship is accessed before load and later updated remotely', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.peekRecord('user', '1') as unknown as User;

    assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

    // access the relationship before load
    try {
      user.bestFriend;

      // in IS_DEBUG we error and should not reach here
      assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }

    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          bestFriend: { data: { type: 'user', id: '3' } },
        },
      },
      included: [
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Peter',
          },
        },
      ],
    });

    // access the relationship again
    const bestFriend = user.bestFriend;
    assert.ok(true, 'accessing the relationship should not throw');
    assert.strictEqual(bestFriend.name, 'Peter', 'the relationship is loaded');
  });

  test('When a sync relationship is accessed before load and later mutated', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.peekRecord('user', '1') as unknown as User;

    assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

    // access the relationship before load
    try {
      user.bestFriend;

      // in IS_DEBUG we error and should not reach here
      assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }

    const peter = store.createRecord('user', { name: 'Peter' }) as unknown as User;
    user.bestFriend = peter;

    // access the relationship again
    const bestFriend = user.bestFriend;
    assert.ok(true, 'accessing the relationship should not throw');
    assert.strictEqual(bestFriend.name, 'Peter', 'the relationship is loaded');
  });

  test('When a sync relationship is accessed before load and then later sideloaded', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.peekRecord('user', '1') as unknown as User;

    // access the relationship before load
    try {
      const bestFriend = user.bestFriend;

      // in IS_DEBUG we error and should not reach here
      assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
      assert.strictEqual(bestFriend.name, undefined, 'the relationship name is not present');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }

    // sideload the relationship
    store.push({
      data: {
        type: 'user',
        id: '2',
        attributes: {
          name: 'Krystan',
        },
      },
    });

    // access the relationship after sideload
    try {
      const bestFriend = user.bestFriend;
      assert.ok(true, 'accessing the relationship should not throw');
      assert.strictEqual(bestFriend.name, 'Krystan', 'the relationship is loaded');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }
  });

  test('When a sync relationship is accessed before load and then later attempted to be found via findRecord', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.peekRecord('user', '1') as unknown as User;
    this.owner.register(
      'adapter:application',
      class {
        findRecord(store: Store, schema: ModelSchema, id: string, snapshot: Snapshot) {
          assert.step('findRecord');
          assert.deepEqual(snapshot._attributes, { name: undefined }, 'the snapshot has the correct attributes');
          return Promise.resolve({
            data: {
              type: 'user',
              id: '2',
              attributes: {
                name: 'Krystan',
              },
            },
          });
        }
        static create() {
          return new this();
        }
      }
    );

    // access the relationship before load
    try {
      const bestFriend = user.bestFriend;

      // in IS_DEBUG we error and should not reach here
      assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
      assert.strictEqual(bestFriend.name, undefined, 'the relationship name is not present');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }

    // sideload the relationship
    await store.findRecord('user', '2');
    assert.verifySteps(['findRecord'], 'we called findRecord');

    // access the relationship after sideload
    try {
      const bestFriend = user.bestFriend;
      assert.ok(true, 'accessing the relationship should not throw');
      assert.strictEqual(bestFriend.name, 'Krystan', 'the relationship is loaded');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }
  });

  test('When a sync relationship is accessed before load and a later attempt to load via findRecord errors', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user = store.peekRecord('user', '1') as unknown as User;
    this.owner.register(
      'adapter:application',
      class {
        findRecord(store: Store, schema: ModelSchema, id: string, snapshot: Snapshot) {
          assert.step('findRecord');
          assert.deepEqual(snapshot._attributes, { name: undefined }, 'the snapshot has the correct attributes');

          return Promise.reject(new Error('404 - Not Found'));
        }
        static create() {
          return new this();
        }
      }
    );

    // access the relationship before load
    try {
      const bestFriend = user.bestFriend;

      // in IS_DEBUG we error and should not reach here
      assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
      assert.strictEqual(bestFriend.name, undefined, 'the relationship name is not present');
    } catch (e) {
      // In IS_DEBUG we should reach here, in production we should not
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
    }

    // in production because we do not error above the call to getAttr will populate the _attributes object
    // in the cache, leading recordData.isEmpty() to return false, thus moving the record into a "loaded" state
    // which additionally means that findRecord is treated as a background request.
    //
    // for this testwe care more that a request is made, than whether it was foreground or background so we force
    // the request to be foreground by using reload: true
    await store.findRecord('user', '2', { reload: true }).catch(() => {
      assert.step('we error');
    });
    assert.verifySteps(['findRecord', 'we error'], 'we called findRecord');

    // access the relationship after sideload
    try {
      const bestFriend = user.bestFriend;

      // in production we do not error
      assert.ok(true, 'accessing the relationship should not throw');

      // in IS_DEBUG we should error for this assert
      // this is a surprise, because usually failed load attempts result in records being fully removed
      // from the store, and so we would expect the relationship to be null
      assert.strictEqual(bestFriend.name, undefined, 'the relationship is not loaded');
    } catch (e) {
      // In IS_DEBUG we should error
      assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
      if (IS_DEBUG) {
        assert.strictEqual(
          (e as Error).message,
          `Cannot read properties of null (reading 'name')`,
          'we get the expected error'
        );
      }
    }
  });
});
