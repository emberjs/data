import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { DEBUG } from '@ember-data/env';
import Model, { attr, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { ExistingResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';

let IS_DEBUG = false;

if (DEBUG) {
  IS_DEBUG = true;
}

class User extends Model {
  @attr declare name: string;
  @hasMany('user', { async: false, inverse: 'friends' }) declare friends: User[];
}

function krystanData() {
  return {
    id: '2',
    type: 'user',
    attributes: {
      name: 'Krystan',
    },
  };
}

function krystanRef(): ExistingResourceIdentifierObject {
  return { type: 'user', id: '2' };
}

function samData() {
  return {
    id: '3',
    type: 'user',
    attributes: {
      name: 'Sam',
    },
  };
}

function samRef(): ExistingResourceIdentifierObject {
  return { type: 'user', id: '3' };
}

function ericData() {
  return {
    id: '4',
    type: 'user',
    attributes: {
      name: 'Eric',
    },
  };
}

function ericRef(): ExistingResourceIdentifierObject {
  return { type: 'user', id: '4' };
}

function chrisData(friends: ExistingResourceIdentifierObject[]) {
  return {
    id: '1',
    type: 'user',
    attributes: {
      name: 'Chris',
    },
    relationships: {
      friends: {
        data: friends,
      },
    },
  };
}

function makeUser(store: Store, friends: ExistingResourceIdentifierObject[]): User {
  return store.push({
    data: chrisData(friends),
    included: [krystanData(), samData(), ericData()],
  }) as User;
}

function assertPreconditions(
  assert: Assert,
  state: User[],
  { expectedLength, hasDuplicates }: { expectedLength: number; hasDuplicates: boolean }
): void {
  assert.strictEqual(state.length, expectedLength, 'precond - the new state has the correct length');
  const deduped = [...new Set(state)];
  assert.strictEqual(
    hasDuplicates,
    deduped.length !== state.length,
    `precond - the new state contains ${hasDuplicates ? '' : 'no '}duplicates`
  );
}

module('Integration | Relationships | Collection | Mutation', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
  });

  module('Added duplicate not already in remote state', function () {
    test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 0, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, []);

      const friends = user.friends;
      assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [Sam];
      assertPreconditions(assert, newState, { expectedLength: 1, hasDuplicates: false });

      try {
        user.friends = newState;
        assert.strictEqual(friends.length, 1, 'the user has one friend');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [Sam, Sam];
      assertPreconditions(assert, newState2, { expectedLength: 2, hasDuplicates: true });

      try {
        user.friends = newState2;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friend');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
          'error thrown has correct message'
        );
      }
    });

    test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 0, single-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, []);

      const friends = user.friends;
      assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [Sam, Sam];
      assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

      try {
        user.friends = newState;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friends');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
          'error thrown has correct message'
        );
      }
    });

    test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef()]);

      const friends = user.friends;
      assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
      const Krystan = store.peekRecord('user', '2') as User;
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [Krystan, Sam];
      assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: false });

      try {
        user.friends = newState;
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [Krystan, Sam, Sam];
      assertPreconditions(assert, newState2, { expectedLength: 3, hasDuplicates: true });

      try {
        user.friends = newState2;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
          'error thrown has correct message'
        );
      }
    });

    test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef(), samRef()]);

      const friends = user.friends;
      assert.strictEqual(friends.length, 2, 'precond - the user has two friends');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
      assert.strictEqual(friends[1].name, 'Sam', 'precond - the user has the correct friends');
      const Krystan = store.peekRecord('user', '2') as User;
      const Eric = store.peekRecord('user', '4') as User;

      const newState = [Krystan, Krystan];
      assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

      try {
        user.friends = newState;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has 1 friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
          'error thrown has correct message'
        );
      }

      if (!IS_DEBUG) {
        const newState2 = [Eric, Krystan, Krystan];
        assertPreconditions(assert, newState2, { expectedLength: 3, hasDuplicates: true });

        try {
          user.friends = newState2;
          assert.strictEqual(friends.length, 2, 'the user has two friends');
          assert.strictEqual(friends[0].name, 'Eric', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Krystan', 'the user has the correct friends');
        } catch (e) {
          assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
        }
      }
    });
  });

  module('Added duplicate already present in remote state', function () {
    test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef()]);
      const Sam = store.peekRecord('user', '3') as User;
      const Krystan = store.peekRecord('user', '2') as User;

      const friends = user.friends;
      assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');

      const newState = [Krystan, Krystan, Sam];
      assert.strictEqual(newState.length, 3, 'precond - the new state contains duplicates');
      assertPreconditions(assert, newState, { expectedLength: 3, hasDuplicates: true });

      try {
        user.friends = newState;
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, `expected no error to be thrown, got ${(e as Error).message}`);
        assert.strictEqual(
          (e as Error).message,
          `Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to \`<user:1>.friends\`\n\t- @lid:user-2`,
          'error thrown has correct message'
        );
      }

      if (!IS_DEBUG) {
        const newState2 = [Krystan, Sam, Krystan, Sam];
        assertPreconditions(assert, newState2, { expectedLength: 4, hasDuplicates: true });

        try {
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
            `Assertion Failed: Cannot start a new array transaction while a previous transaction is underway`,
            'error thrown has correct message'
          );
        }
      }
    });
  });

  module('Pushing new records', function () {
    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 0, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, []);

      const friends = user.friends;
      assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [Sam];
      assertPreconditions(assert, newState, { expectedLength: 1, hasDuplicates: false });

      try {
        friends.push(...newState);
        assert.strictEqual(friends.length, 1, 'the user has one friend');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
      }

      const newState2 = [Sam, Sam];
      assertPreconditions(assert, newState2, { expectedLength: 2, hasDuplicates: true });

      try {
        friends.push(...newState2);
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friend');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot push duplicates to a hasMany's state. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
          'error thrown has correct message'
        );
      }
    });

    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 0, single-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, []);

      const friends = user.friends;
      assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [Sam, Sam];
      assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

      try {
        friends.push(...newState);
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 1, 'the user has one friends');
        assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot push duplicates to a hasMany's state. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
          'error thrown has correct message'
        );
      }
    });

    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef()]);

      const friends = user.friends;
      assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
      const Krystan = store.peekRecord('user', '2') as User;
      const Sam = store.peekRecord('user', '3') as User;

      const newState = [Krystan, Sam];
      assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: false });

      try {
        friends.push(...newState);
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot push duplicates to a hasMany's state. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
          'error thrown has correct message'
        );
      }

      if (!IS_DEBUG) {
        const newState2 = [Krystan, Sam, Sam];
        assertPreconditions(assert, newState2, { expectedLength: 3, hasDuplicates: true });

        try {
          friends.push(...newState2);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 2, 'the user has two friends');
          assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot push duplicates to a hasMany's state. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
            'error thrown has correct message'
          );
        }
      }
    });

    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef(), samRef()]);

      const friends = user.friends;
      assert.strictEqual(friends.length, 2, 'precond - the user has two friends');
      assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
      assert.strictEqual(friends[1].name, 'Sam', 'precond - the user has the correct friends');
      const Krystan = store.peekRecord('user', '2') as User;

      const newState = [Krystan, Krystan];
      assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

      try {
        friends.push(...newState);
        assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(friends.length, 2, 'the user has 2 friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
      } catch (e) {
        assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
        assert.strictEqual(
          (e as Error).message,
          "Assertion Failed: Cannot push duplicates to a hasMany's state. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
          'error thrown has correct message'
        );
      }
    });
  });

  module('Unshifting new records', function () {});

  module('Splicing in new records', function () {
    module('full replace', function () {
      test('When replacing (via splice) the state of a hasMany we error if the new state contains duplicates (starting length 0, single-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, []);

        const friends = user.friends;
        assert.strictEqual(friends.length, 0, 'precond - the user has no friends');
        const Sam = store.peekRecord('user', '3') as User;

        const newState = [Sam, Sam];
        assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

        try {
          friends.splice(0, 0, ...newState);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 1, 'the user has one friend');
          assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
            'error thrown has correct message'
          );
        }
      });

      test('When replacing (via splice) the state of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef(), samRef()]);

        const friends = user.friends;
        assert.strictEqual(friends.length, 2, 'precond - the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'precond - the user has the correct friends');
        const Krystan = store.peekRecord('user', '2') as User;

        const newState = [Krystan, Krystan];
        assertPreconditions(assert, newState, { expectedLength: friends.length, hasDuplicates: true });

        try {
          friends.splice(0, friends.length, ...newState);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 1, 'the user has 1 friends');
          assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot replace a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
            'error thrown has correct message'
          );
        }
      });
    });

    module('partial splice', function () {
      test('When splicing the state (to the end) of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

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
          included: [krystanData(), samData(), ericData()],
        }) as User;

        const friends = user.friends;
        assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
        assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
        const Krystan = store.peekRecord('user', '2') as User;
        const Sam = store.peekRecord('user', '3') as User;

        const newState = [Krystan, Sam];
        assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: false });

        try {
          friends.splice(1, 0, ...newState);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot splice a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
            'error thrown has correct message'
          );
        }

        if (!IS_DEBUG) {
          const newState2 = [Krystan, Sam, Sam];
          assertPreconditions(assert, newState2, { expectedLength: 3, hasDuplicates: true });

          try {
            friends.splice(2, 0, ...newState2);
            assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
            assert.strictEqual(friends.length, 2, 'the user has two friends');
            assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
            assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
          } catch (e) {
            assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
            assert.strictEqual(
              (e as Error).message,
              "Assertion Failed: Cannot splice a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3",
              'error thrown has correct message'
            );
          }
        }
      });

      test('When splicing the state (to the beginning) of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

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
          included: [krystanData(), samData(), ericData()],
        }) as User;

        const friends = user.friends;
        assert.strictEqual(friends.length, 1, 'precond - the user has one friend');
        assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
        const Krystan = store.peekRecord('user', '2') as User;
        const Sam = store.peekRecord('user', '3') as User;

        const newState = [Sam];
        assertPreconditions(assert, newState, { expectedLength: 1, hasDuplicates: false });

        try {
          friends.splice(0, 0, ...newState);
          assert.strictEqual(friends.length, 2, 'the user has two friends');
          assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Krystan', 'the user has the correct friends');
        } catch (e) {
          assert.ok(false, `expected no error to be thrown, got ${(e as Error).message}`);
        }

        const newState2 = [Sam, Krystan, Sam];
        assertPreconditions(assert, newState2, { expectedLength: 3, hasDuplicates: true });

        try {
          friends.splice(0, 0, ...newState2);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 2, 'the user has two friends');
          assert.strictEqual(friends[0].name, 'Sam', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Krystan', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot splice a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-3\n\t- @lid:user-2",
            'error thrown has correct message'
          );
        }
      });

      test('When splicing the state (to the end) of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef(), samRef()]);

        const friends = user.friends;
        assert.strictEqual(friends.length, 2, 'precond - the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'precond - the user has the correct friends');
        const Krystan = store.peekRecord('user', '2') as User;

        const newState = [Krystan, Krystan];
        assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

        try {
          friends.splice(2, 0, ...newState);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 2, 'the user has 2 friends');
          assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot splice a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
            'error thrown has correct message'
          );
        }
      });

      test('When splicing the state (to the middle) of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef(), samRef()]);

        const friends = user.friends;
        assert.strictEqual(friends.length, 2, 'precond - the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'precond - the user has the correct friends');
        const Krystan = store.peekRecord('user', '2') as User;

        const newState = [Krystan, Krystan];
        assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

        try {
          friends.splice(1, 0, ...newState);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 2, 'the user has 2 friends');
          assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot splice a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
            'error thrown has correct message'
          );
        }
      });

      test('When splicing the state (to the beginning) of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef(), samRef()]);

        const friends = user.friends;
        assert.strictEqual(friends.length, 2, 'precond - the user has two friends');
        assert.strictEqual(friends[0].name, 'Krystan', 'precond - the user has the correct friends');
        assert.strictEqual(friends[1].name, 'Sam', 'precond - the user has the correct friends');
        const Krystan = store.peekRecord('user', '2') as User;

        const newState = [Krystan, Krystan];
        assertPreconditions(assert, newState, { expectedLength: 2, hasDuplicates: true });

        try {
          friends.splice(0, 0, ...newState);
          assert.notOk(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(friends.length, 2, 'the user has 2 friends');
          assert.strictEqual(friends[0].name, 'Krystan', 'the user has the correct friends');
          assert.strictEqual(friends[1].name, 'Sam', 'the user has the correct friends');
        } catch (e) {
          assert.ok(IS_DEBUG, 'expected error to be thrown in debug mode');
          assert.strictEqual(
            (e as Error).message,
            "Assertion Failed: Cannot splice a hasMany's state with a new state that contains duplicates. Found duplicates for the following records within the new state provided to `<user:1>.friends`\n\t- @lid:user-2",
            'error thrown has correct message'
          );
        }
      });
    });
  });
});
