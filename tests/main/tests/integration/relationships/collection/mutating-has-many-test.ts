import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { DEBUG } from '@ember-data/env';
import Model, { attr, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import { ExistingResourceIdentifierObject } from '@ember-data/types/q/ember-data-json-api';

/*

For each case we should check (if applicable):

starting length 0, new state contains NO duplicates
starting length 0, new state contains duplicates
starting length 1, new state contains NO duplicates
starting length 1, new state contains duplicates
starting length 1, new state contains duplicates already present in remote state
starting length 2, new state contains NO duplicates
starting length 2, new state contains duplicates
starting length 2, new state contains duplicates already present in remote state

*/

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

type Mutation = {
  method: 'push' | 'unshift' | 'splice' | 'replace';
  values: ExistingResourceIdentifierObject[];
  start?: number;
  deleteCount?: number;
};

function generateAppliedMutation(store: Store, record: User, mutation: Mutation) {
  const friends = record.friends;
  let outcomeValues: User[];
  let error: string;
  switch (mutation.method) {
    case 'push':
      error = "Cannot push duplicates to a hasMany's state.";
      outcomeValues = [...friends, ...mutation.values.map((ref) => store.peekRecord(ref) as User)];
      break;
    case 'unshift':
      error = 'FIXME';
      outcomeValues = [...mutation.values.map((ref) => store.peekRecord(ref) as User), ...friends];
      break;
    case 'splice':
      error = "Cannot splice a hasMany's state with a new state that contains duplicates.";
      outcomeValues = friends.slice();
      outcomeValues.splice(
        mutation.start ?? 0,
        mutation.deleteCount ?? 0,
        ...mutation.values.map((ref) => store.peekRecord(ref) as User)
      );
      break;
    case 'replace':
      error = `Cannot replace a hasMany's state with a new state that contains duplicates.`;
      outcomeValues = mutation.values.map((ref) => store.peekRecord(ref) as User);
      break;
  }

  const seen = new Set<User>();
  const duplicates = new Set<User>();
  outcomeValues.forEach((item) => {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  });

  const outcome = Array.from(new Set(outcomeValues));
  const hasDuplicates = outcomeValues.length !== outcome.length;
  return {
    hasDuplicates,
    duplicates: Array.from(duplicates),
    prod: {
      length: outcome.length,
      membership: outcome,
      ids: outcome.map((v) => v.id),
    },
    debug: {
      length: hasDuplicates ? friends.length : outcome.length,
      membership: hasDuplicates ? friends.slice() : outcome,
      ids: hasDuplicates ? friends.map((v) => v.id) : outcome.map((v) => v.id),
      error,
    },
  };
}

function applyMutation(assert: Assert, store: Store, record: User, mutation: Mutation) {
  const result = generateAppliedMutation(store, record, mutation);
  const outcome = IS_DEBUG ? result.debug : result.prod;

  try {
    switch (mutation.method) {
      case 'push':
        record.friends.push(...mutation.values.map((ref) => store.peekRecord(ref) as User));
        break;
      case 'unshift':
        record.friends.unshift(...mutation.values.map((ref) => store.peekRecord(ref) as User));
        break;
      case 'splice':
        record.friends.splice(
          mutation.start ?? 0,
          mutation.deleteCount ?? 0,
          ...mutation.values.map((ref) => store.peekRecord(ref) as User)
        );
        break;
      case 'replace':
        record.friends = mutation.values.map((ref) => store.peekRecord(ref) as User);
        break;
    }
    assert.ok(
      !result.hasDuplicates || !IS_DEBUG,
      `expected error ${result.hasDuplicates ? '' : 'NOT '}to be thrown only in debug mode`
    );
  } catch (e) {
    assert.ok(
      result.hasDuplicates && IS_DEBUG,
      `expected error ${result.hasDuplicates ? '' : 'NOT '}to be thrown only in debug mode`
    );
    const expectedMessage =
      'error' in outcome
        ? `Assertion Failed: ${
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            outcome.error
          } Found duplicates for the following records within the new state provided to \`<user:${
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            record.id
          }>.friends\`\n\t- ${Array.from(result.duplicates)
            .map((r) => recordIdentifierFor(r).lid)
            .join('\n\t- ')}`
        : '';
    assert.strictEqual((e as Error).message, expectedMessage, `error thrown has correct message: ${expectedMessage}`);
  }

  assert.strictEqual(
    record.friends.length,
    outcome.length,
    `the new state has the correct length of ${outcome.length} after ${mutation.method}`
  );
  assert.deepEqual(
    record.friends.slice(),
    outcome.membership,
    `the new state has the correct records ${outcome.ids.join(',')} after ${mutation.method}`
  );
  assert.deepEqual(
    record.hasMany('friends').ids(),
    outcome.ids,
    `the new state has the correct ids on the reference ${outcome.ids.join(',')} after ${mutation.method}`
  );
  assert.strictEqual(
    record.hasMany('friends').ids().length,
    outcome.length,
    `the new state has the correct length on the reference of ${outcome.length} after ${mutation.method}`
  );
  assert.strictEqual(
    record.friends.length,
    new Set(record.friends).size,
    `the new state has no duplicates after ${mutation.method}`
  );
}

function getMutations() {
  return [
    {
      method: 'push',
      values: [krystanRef()],
    },
  ];
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

module('Integration | Relationships | Collection | Mutation', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
  });

  module('Replacing state', function () {
    module('Added duplicate not already in remote state', function () {
      test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 0, multi-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, []);

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [samRef()],
        });

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [samRef(), samRef()],
        });
      });

      test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 0, single-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, []);

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [samRef(), samRef()],
        });
      });

      test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef()]);

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [krystanRef(), samRef()],
        });

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [krystanRef(), samRef(), samRef()],
        });
      });

      test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef(), samRef()]);

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [krystanRef(), krystanRef()],
        });

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [ericRef(), krystanRef(), samRef()],
        });
      });
    });

    module('Added duplicate already present in remote state', function () {
      test('When replacing the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
        const store = this.owner.lookup('service:store') as Store;

        const user = makeUser(store, [krystanRef()]);

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [krystanRef(), krystanRef(), samRef()],
        });

        applyMutation(assert, store, user, {
          method: 'replace',
          values: [krystanRef(), samRef(), krystanRef(), samRef()],
        });
      });
    });
  });

  module('Pushing new records', function () {
    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 0, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, []);

      applyMutation(assert, store, user, {
        method: 'push',
        values: [samRef()],
      });

      applyMutation(assert, store, user, {
        method: 'push',
        values: [samRef(), samRef()],
      });
    });

    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 0, single-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, []);

      applyMutation(assert, store, user, {
        method: 'push',
        values: [samRef(), samRef()],
      });
    });

    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef()]);

      applyMutation(assert, store, user, {
        method: 'push',
        values: [krystanRef(), samRef()],
      });

      applyMutation(assert, store, user, {
        method: 'push',
        values: [krystanRef(), samRef(), samRef()],
      });
    });

    test('When pushing to the state of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef(), samRef()]);

      applyMutation(assert, store, user, {
        method: 'push',
        values: [krystanRef(), krystanRef()],
      });
    });
  });

  module('Unshifting new records', function () {});

  module('Splicing in new records', function () {
    test('When splicing the state (to the end) of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef()]);

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [krystanRef(), samRef()],
        start: 1,
        deleteCount: 0,
      });

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [krystanRef(), samRef(), samRef()],
        start: 2,
        deleteCount: 0,
      });
    });

    test('When splicing the state (to the beginning) of a hasMany we error if the new state contains duplicates (starting length 1, multi-change)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef()]);

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [samRef()],
        start: 0,
        deleteCount: 0,
      });

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [samRef(), krystanRef(), samRef()],
        start: 0,
        deleteCount: 0,
      });
    });

    test('When splicing the state (to the end) of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef(), samRef()]);

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [krystanRef(), krystanRef()],
        start: 2,
        deleteCount: 0,
      });
    });

    test('When splicing the state (to the middle) of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef(), samRef()]);

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [krystanRef(), krystanRef()],
        start: 1,
        deleteCount: 0,
      });
    });

    test('When splicing the state (to the beginning) of a hasMany we error if the new state contains duplicates (starting length 2)', function (assert) {
      const store = this.owner.lookup('service:store') as Store;

      const user = makeUser(store, [krystanRef(), samRef()]);

      applyMutation(assert, store, user, {
        method: 'splice',
        values: [krystanRef(), krystanRef()],
        start: 0,
        deleteCount: 0,
      });
    });
  });
});
