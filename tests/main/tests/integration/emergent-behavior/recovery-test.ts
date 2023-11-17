import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { DEBUG } from '@ember-data/env';
import type { Snapshot } from '@ember-data/legacy-compat/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import type { ModelSchema } from '@ember-data/types/q/ds-model';

let IS_DEBUG = false;

if (DEBUG) {
  IS_DEBUG = true;
}
class User extends Model {
  @attr declare name: string;
  @hasMany('user', { async: false, inverse: null }) declare friends: User[];
  @belongsTo('user', { async: false, inverse: null }) declare bestFriend: User;
  @hasMany('user', { async: false, inverse: 'frenemies' }) declare frenemies: User[];
}

module('Emergent Behavior - Recovery', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
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
          friends: {
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
              { type: 'user', id: '4' },
            ],
          },
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
    });
  });

  module('belongsTo', function () {
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

  module('hasMany', function () {
    test('When a sync relationship is accessed before load', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const user = store.peekRecord('user', '1') as unknown as User;

      assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

      // access the relationship before load
      try {
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
        assert.strictEqual(store.peekRecord('user', '2'), null, 'the related record is not in the store');
        assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(store.peekRecord('user', '2'), null, 'the related record is not in the store');
        assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
    });

    test('When a sync relationship is accessed before load and later updated remotely', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const user = store.peekRecord('user', '1') as unknown as User;

      assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

      // access the relationship before load
      try {
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');

      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            friends: { data: [{ type: 'user', id: '3' }] },
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
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 1, 'the relationship is NOT empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          1,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          1,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 2, 'the store has two records');
    });

    test('When a sync relationship is accessed before load, records are later loaded, and then it is updated by related record deletion', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const user = store.peekRecord('user', '1') as unknown as User;

      assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

      // access the relationship before load
      try {
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');

      const peter = store.push({
        data: {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Peter',
          },
        },
        included: [
          {
            type: 'user',
            id: '2',
            attributes: {
              name: 'Krystan',
            },
          },
          {
            type: 'user',
            id: '4',
            attributes: {
              name: 'Rey',
            },
          },
        ],
      });

      // access the relationship again
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is still INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 4, 'the store has four records');

      this.owner.register(
        'adapter:application',
        class {
          deleteRecord(store: Store, schema: ModelSchema, id: string, snapshot: Snapshot) {
            return Promise.resolve({
              data: null,
            });
          }
          static create() {
            return new this();
          }
        }
      );

      store.deleteRecord(peter);
      await store.saveRecord(peter);
      store.unloadRecord(peter);

      // access the relationship again
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 2, 'the relationship state is now correct');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 3, 'the store has three records');
    });

    test('When a sync relationship is accessed before load and later updated by remote inverse removal', function (assert) {
      class LocalUser extends Model {
        @attr declare name: string;
        @hasMany('local-user', { async: false, inverse: 'friends' }) declare friends: LocalUser[];
      }
      this.owner.register('model:local-user', LocalUser);
      const store = this.owner.lookup('service:store') as Store;
      const user1 = store.push({
        data: {
          type: 'local-user',
          id: '1',
          attributes: {
            name: 'Chris Wagenet',
          },
          relationships: {
            friends: {
              data: [
                { type: 'local-user', id: '2' },
                { type: 'local-user', id: '3' },
                { type: 'local-user', id: '4' },
              ],
            },
          },
        },
        included: [
          {
            type: 'local-user',
            id: '4',
            attributes: {
              name: 'Krystan',
            },
            relationships: {
              friends: {
                data: [{ type: 'local-user', id: '1' }],
              },
            },
          },
        ],
      }) as unknown as LocalUser;
      const user2 = store.peekRecord('local-user', '4') as unknown as LocalUser;

      assert.strictEqual(user1.name, 'Chris Wagenet', 'precond - user1 is loaded');
      assert.strictEqual(user2.name, 'Krystan', 'precond2 - user is loaded');

      // access the relationship before load
      try {
        const friends = user1.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 1, 'the relationship is INCORRECTLY 1');
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      assert.strictEqual(store.peekAll('local-user').length, 2, 'the store has two records');

      // remove user2 from user1's friends via inverse
      store.push({
        data: {
          type: 'local-user',
          id: '4',
          relationships: {
            friends: { data: [] },
          },
        },
      });

      // access the relationship again
      try {
        const friends = user1.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty and shows length 0 instead of 2');
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('local-user').length, 2, 'the store has two records');
    });

    test('When a sync relationship is accessed before load and later mutated directly', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const user = store.peekRecord('user', '1') as unknown as User;

      assert.strictEqual(user.name, 'Chris Wagenet', 'precond - user is loaded');

      // access the relationship before load
      try {
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');
      const peter = store.createRecord('user', { name: 'Peter' }) as unknown as User;

      try {
        user.friends.pushObject(peter);
        assert.notOk(IS_DEBUG, 'mutating the relationship should not throw');
      } catch (e) {
        assert.ok(IS_DEBUG, `mutating the relationship should not throw, received ${(e as Error).message}`);
      }

      // access the relationship again
      try {
        const friends = user.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(
          friends.length,
          1,
          'the relationship is NOT empty but INCORRECTLY shows length 1 instead of 4'
        );
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          4,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 2, 'the store has two records');
    });

    test('When a sync relationship is accessed before load and later mutated via add by inverse', function (assert) {
      class LocalUser extends Model {
        @attr declare name: string;
        @hasMany('local-user', { async: false, inverse: 'friends' }) declare friends: LocalUser[];
      }
      this.owner.register('model:local-user', LocalUser);
      const store = this.owner.lookup('service:store') as Store;
      const user1 = store.push({
        data: {
          type: 'local-user',
          id: '1',
          attributes: {
            name: 'Chris Wagenet',
          },
          relationships: {
            friends: {
              data: [
                { type: 'local-user', id: '2' },
                { type: 'local-user', id: '3' },
                { type: 'local-user', id: '4' },
              ],
            },
          },
        },
        included: [
          {
            type: 'local-user',
            id: '5',
            attributes: {
              name: 'Krystan',
            },
            relationships: {
              friends: {
                data: [],
              },
            },
          },
        ],
      }) as unknown as LocalUser;
      const user2 = store.peekRecord('local-user', '5') as unknown as LocalUser;

      assert.strictEqual(user1.name, 'Chris Wagenet', 'precond - user1 is loaded');
      assert.strictEqual(user2.name, 'Krystan', 'precond2 - user is loaded');

      // access the relationship before load
      try {
        const friends = user1.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      assert.strictEqual(store.peekAll('local-user').length, 2, 'the store has two records');

      // add user2 to user1's friends via inverse
      try {
        user2.friends.pushObject(user1);
        assert.ok(true, 'mutating the relationship should not throw');
      } catch (e) {
        assert.ok(false, `mutating the relationship should not throw, received ${(e as Error).message}`);
      }

      // access the relationship again
      try {
        const friends = user1.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(
          friends.length,
          1,
          'the relationship is NOT empty but INCORRECTLY shows length 1 instead of 4'
        );
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          4,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          4,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('local-user').length, 2, 'the store has two records');
    });

    test('When a sync relationship is accessed before load and later mutated via remove by inverse', function (assert) {
      class LocalUser extends Model {
        @attr declare name: string;
        @hasMany('local-user', { async: false, inverse: 'friends' }) declare friends: LocalUser[];
      }
      this.owner.register('model:local-user', LocalUser);
      const store = this.owner.lookup('service:store') as Store;
      const user1 = store.push({
        data: {
          type: 'local-user',
          id: '1',
          attributes: {
            name: 'Chris Wagenet',
          },
          relationships: {
            friends: {
              data: [
                { type: 'local-user', id: '2' },
                { type: 'local-user', id: '3' },
                { type: 'local-user', id: '4' },
              ],
            },
          },
        },
        included: [
          {
            type: 'local-user',
            id: '4',
            attributes: {
              name: 'Krystan',
            },
            relationships: {
              friends: {
                data: [{ type: 'local-user', id: '1' }],
              },
            },
          },
        ],
      }) as unknown as LocalUser;
      const user2 = store.peekRecord('local-user', '4') as unknown as LocalUser;

      assert.strictEqual(user1.name, 'Chris Wagenet', 'precond - user1 is loaded');
      assert.strictEqual(user2.name, 'Krystan', 'precond2 - user is loaded');

      // access the relationship before load
      try {
        const friends = user1.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 1, 'the relationship is INCORRECTLY 1');

        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);

        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      assert.strictEqual(store.peekAll('local-user').length, 2, 'the store has two records');

      // remove user2 from user1's friends via inverse
      try {
        user2.friends.removeObject(user1);
        assert.ok(true, 'mutating the relationship should not throw');
      } catch (e) {
        assert.ok(false, `mutating the relationship should not throw, received ${(e as Error).message}`);
      }

      // access the relationship again
      try {
        const friends = user1.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty and shows length 0 instead of 2');

        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);

        assert.strictEqual(
          user1.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('local-user').length, 2, 'the store has two records');
    });

    test('When a sync relationship is accessed before load and then later sideloaded', function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const user = store.peekRecord('user', '1') as unknown as User;

      // access the relationship before load
      try {
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');

      // sideload the relationships
      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Krystan',
          },
        },
      });
      store.push({
        data: {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Peter',
          },
        },
      });
      store.push({
        data: {
          type: 'user',
          id: '4',
          attributes: {
            name: 'Rey',
          },
        },
      });

      // access the relationship again
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 4, 'the store has four records');

      // attempt notify of the relationship
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            friends: {
              data: [
                { type: 'user', id: '2' },
                { type: 'user', id: '3' },
                { type: 'user', id: '4' },
              ],
            },
          },
        },
      });

      // access the relationship
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
    });

    test('When a sync relationship is accessed before load and then later one of the missing records is attempted to be found via findRecord (inverse: null)', async function (assert) {
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
                id: '4',
                attributes: {
                  name: 'Rey',
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
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');

      // sideload two of the relationships
      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Krystan',
          },
        },
      });
      store.push({
        data: {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Peter',
          },
        },
      });

      // access the relationship again
      try {
        const friends = user.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 3, 'the store has four records');

      // attempt notify of the relationship
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            friends: {
              data: [
                { type: 'user', id: '2' },
                { type: 'user', id: '3' },
                { type: 'user', id: '4' },
              ],
            },
          },
        },
      });

      // access the relationship
      try {
        const friends = user.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      // attempt to find the missing record
      try {
        await store.findRecord('user', '4');
        assert.ok(true, 'finding the missing record should not throw');
      } catch (e) {
        assert.ok(false, `finding the missing record should not throw, received ${(e as Error).message}`);
      }
      assert.verifySteps(['findRecord'], 'we called findRecord');

      // check the relationship again
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
    });

    test('When a sync relationship is accessed before load and then later one of the missing records is attempted to be found via findRecord (inverse: specified)', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      const user = store.peekRecord('user', '1') as unknown as User;
      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Chris Wagenet',
          },
          relationships: {
            frenemies: {
              data: [
                { type: 'user', id: '2' },
                { type: 'user', id: '3' },
                { type: 'user', id: '4' },
              ],
            },
          },
        },
      });
      this.owner.register(
        'adapter:application',
        class {
          findRecord(store: Store, schema: ModelSchema, id: string, snapshot: Snapshot) {
            assert.step('findRecord');
            if (snapshot.include === 'frenemies') {
              assert.deepEqual(snapshot._attributes, { name: 'Rey' }, 'the snapshot has the correct attributes');

              return Promise.resolve({
                data: {
                  type: 'user',
                  id: '4',
                  attributes: {
                    name: 'Rey',
                  },
                  relationships: {
                    frenemies: {
                      data: [{ type: 'user', id: '1' }],
                    },
                  },
                },
              });
            }
            assert.deepEqual(snapshot._attributes, { name: undefined }, 'the snapshot has the correct attributes');

            return Promise.resolve({
              data: {
                type: 'user',
                id: '4',
                attributes: {
                  name: 'Rey',
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
        const friends = user.frenemies;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');

      // sideload two of the relationships
      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Krystan',
          },
        },
      });
      store.push({
        data: {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Peter',
          },
        },
      });

      // access the relationship again
      try {
        const friends = user.frenemies;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 3, 'the store has three records');

      // attempt notify of the relationship
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            frenemies: {
              data: [
                { type: 'user', id: '2' },
                { type: 'user', id: '3' },
                { type: 'user', id: '4' },
              ],
            },
          },
        },
      });

      // access the relationship
      try {
        const friends = user.frenemies;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY length 0 instead of 3');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      // attempt to find the missing record
      try {
        await store.findRecord('user', '4');
        assert.ok(true, 'finding the missing record should not throw');
      } catch (e) {
        assert.ok(false, `finding the missing record should not throw, received ${(e as Error).message}`);
      }
      assert.verifySteps(['findRecord'], 'we called findRecord');

      // check the relationship again
      try {
        const friends = user.frenemies;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY length 0 instead of 3');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 3, 'the store INCORRECTLY shows 3 instead of 4 records');

      // attempt to find the missing record with sideload
      try {
        await store.findRecord('user', '4', { reload: true, include: 'frenemies' });
        assert.ok(true, 'finding the missing record should not throw');
      } catch (e) {
        assert.ok(false, `finding the missing record should not throw, received ${(e as Error).message}`);
      }
      assert.verifySteps(['findRecord'], 'we called findRecord');

      // check the relationship again
      try {
        const friends = user.frenemies;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY length 0 instead of 3');
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
      }
      assert.strictEqual(store.peekAll('user').length, 3, 'the store INCORRECTLY shows 3 instead of 4 records');
    });

    test('When a sync relationship is accessed before load and then later when one of the missing records is later attempt to load via findRecord would error (inverse: null)', async function (assert) {
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
        const friends = user.friends;

        // in IS_DEBUG we error and should not reach here
        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        // In IS_DEBUG we should reach here, in production we should not
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 1, 'the store has only one record');

      // sideload two of the relationships
      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Krystan',
          },
        },
      });
      store.push({
        data: {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Peter',
          },
        },
      });

      // access the relationship again
      try {
        const friends = user.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }
      assert.strictEqual(store.peekAll('user').length, 3, 'the store has four records');

      // attempt notify of the relationship
      store.push({
        data: {
          type: 'user',
          id: '1',
          relationships: {
            friends: {
              data: [
                { type: 'user', id: '2' },
                { type: 'user', id: '3' },
                { type: 'user', id: '4' },
              ],
            },
          },
        },
      });

      // access the relationship
      try {
        const friends = user.friends;

        assert.notOk(IS_DEBUG, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 0, 'the relationship is INCORRECTLY empty');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          3,
          'the relationship reference contains the expected ids'
        );
      }

      // attempt to find the missing record
      try {
        await store.findRecord('user', '4');
        assert.ok(false, 'finding the missing record should throw');
      } catch (e) {
        assert.ok(true, `finding the missing record should throw, received ${(e as Error).message}`);
      }
      assert.verifySteps(['findRecord'], 'we called findRecord');

      // check the relationship again
      try {
        const friends = user.friends;

        assert.ok(true, 'accessing the relationship should not throw');
        assert.strictEqual(friends.length, 2, 'the relationship is correct');
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      } catch (e) {
        assert.ok(false, `accessing the relationship should not throw, received ${(e as Error).message}`);
        assert.strictEqual(
          user.hasMany('friends').ids().length,
          2,
          'the relationship reference contains the expected ids'
        );
      }
    });
  });
});
