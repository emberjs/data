import { module, skip, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { DEBUG } from '@ember-data/env';
import Model, { attr, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';

let IS_DEBUG = false;

if (DEBUG) {
  IS_DEBUG = true;
}

module('Integration | Relationships | Collection | Mutation', function (hooks) {
  setupTest(hooks);

  module('Added duplicate not already in remote state', function () {
    skip('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 0, multi-change)', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      class User extends Model {
        @attr declare name: string;
        @hasMany('user', { async: true, inverse: 'friends' }) declare friends: Promise<User[]>;
      }

      this.owner.register('model:user', User);

      const user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            friends: {
              data: [],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Krystan',
            },
          },
          {
            id: '3',
            type: 'user',
            attributes: {
              name: 'Sam',
            },
          },
          {
            id: '4',
            type: 'user',
            attributes: {
              name: 'Eric',
            },
          },
        ],
      }) as User;

      const friends = await user.friends;
      assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [...friends, Sam];
      assert.strictEqual(newState.length, 1, 'precond - the new state contains only the one new record');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState;
        assert.ok(true, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friend');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [...friends, Sam];
      assert.strictEqual(newState2.length, 2, 'precond - the new state contains duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState2;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friend');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found <user:2> multiple times within the new state provided to `<user:1>.friends`",
          'error thrown has correct message'
        );
      }
    });

    skip('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 0, single-change)', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      class User extends Model {
        @attr declare name: string;
        @hasMany('user', { async: true, inverse: 'friends' }) declare friends: Promise<User[]>;
      }

      this.owner.register('model:user', User);

      const user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            friends: {
              data: [],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Krystan',
            },
          },
          {
            id: '3',
            type: 'user',
            attributes: {
              name: 'Sam',
            },
          },
          {
            id: '4',
            type: 'user',
            attributes: {
              name: 'Eric',
            },
          },
        ],
      }) as User;

      const friends = await user.friends;
      assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [...friends, Sam, Sam];
      assert.strictEqual(newState.length, 2, 'precond - the new state contains duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friends');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found <user:2> multiple times within the new state provided to `<user:1>.friends`",
          'error thrown has correct message'
        );
      }
    });

    skip('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      class User extends Model {
        @attr declare name: string;
        @hasMany('user', { async: true, inverse: 'friends' }) declare friends: Promise<User[]>;
      }

      this.owner.register('model:user', User);

      const user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '2' }],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Krystan',
            },
          },
          {
            id: '3',
            type: 'user',
            attributes: {
              name: 'Sam',
            },
          },
          {
            id: '4',
            type: 'user',
            attributes: {
              name: 'Eric',
            },
          },
        ],
      }) as User;

      const friends = await user.friends;
      assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [...friends, Sam];
      assert.strictEqual(newState.length, 2, 'precond - the new state contains no duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState;
        assert.ok(true, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [...friends, Sam];
      assert.strictEqual(newState2.length, 3, 'precond - the new state contains duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState2;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found <user:2> multiple times within the new state provided to `<user:1>.friends`",
          'error thrown has correct message'
        );
      }
    });

    skip('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 2)', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      class User extends Model {
        @attr declare name: string;
        @hasMany('user', { async: true, inverse: 'friends' }) declare friends: Promise<User[]>;
      }

      this.owner.register('model:user', User);

      const user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '2' }],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Krystan',
            },
          },
          {
            id: '3',
            type: 'user',
            attributes: {
              name: 'Sam',
            },
          },
          {
            id: '4',
            type: 'user',
            attributes: {
              name: 'Eric',
            },
          },
        ],
      }) as User;

      const friends = await user.friends;
      assert.strictEqual(friends.length, 1, 'precond - the user has two friends');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [...friends, Sam];
      assert.strictEqual(newState.length, 2, 'precond - the new state contains duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState;
        assert.ok(true, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has three friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [...friends, Sam];
      assert.strictEqual(newState2.length, 2, 'precond - the new state contains duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState2;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found <user:2> multiple times within the new state provided to `<user:1>.friends`",
          'error thrown has correct message'
        );
      }
    });
  });

  module('Added duplicate already present in remote state', function () {
    test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', async function (assert) {
      const store = this.owner.lookup('service:store') as Store;
      class User extends Model {
        @attr declare name: string;
        @hasMany('user', { async: true, inverse: 'friends' }) declare friends: Promise<User[]>;
      }

      this.owner.register('model:user', User);

      const user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '2' }],
            },
          },
        },
        included: [
          {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Krystan',
            },
          },
          {
            id: '3',
            type: 'user',
            attributes: {
              name: 'Sam',
            },
          },
          {
            id: '4',
            type: 'user',
            attributes: {
              name: 'Eric',
            },
          },
        ],
      }) as User;
      const Sam = store.peekRecord('user', '3') as User;
      const Krystan = store.peekRecord('user', '2') as User;

      const friends = await user.friends;
      assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');

      const newState = [...friends, Krystan, Sam];
      assert.strictEqual(newState.length, 3, 'precond - the new state contains duplicates');

      try {
        // @ts-expect-error assignment to async
        user.friends = newState;
        assert.ok(true, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [...friends, Krystan, Sam];
      assert.strictEqual(newState2.length, 4, 'precond - the new state contains duplicates');

      try {
        debugger;
        // @ts-expect-error assignment to async
        user.friends = newState2;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
        assert.deepEqual(
          friends.map((v) => v.id),
          ['2', '3'],
          'expected ids'
        );
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found <user:2> multiple times within the new state provided to `<user:1>.friends`",
          'error thrown has correct message'
        );
      }
    });
  });
});
