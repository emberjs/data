import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import { DEPRECATE_MANY_ARRAY_DUPLICATES } from '@warp-drive/build-config/deprecations';
import type { ExistingResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';
import { ResourceType } from '@warp-drive/core-types/symbols';

import type { ReactiveContext } from '../../../helpers/reactive-context';
import { unboundReactiveContext } from '../../../helpers/reactive-context';

let IS_DEPRECATE_MANY_ARRAY_DUPLICATES = false;

if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
  IS_DEPRECATE_MANY_ARRAY_DUPLICATES = true;
}

class User extends Model {
  @attr declare name: string;
  @hasMany('user', { async: false, inverse: 'friends' }) declare friends: User[];

  [ResourceType] = 'user' as const;
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

type Mutation = {
  name: string;
  method: 'push' | 'unshift' | 'splice';
  values: ExistingResourceIdentifierObject[];
  start?: (record: User) => number;
  deleteCount?: (record: User) => number;
};

function generateAppliedMutation(store: Store, record: User, mutation: Mutation) {
  const friends = record.friends;
  let outcomeValues: User[];
  let error: string;

  let seen = new Set<User>();
  const duplicates = new Set<User>();
  let outcome: User[];

  switch (mutation.method) {
    case 'push':
      error = "Cannot push duplicates to a hasMany's state.";
      outcomeValues = [...friends, ...mutation.values.map((ref) => store.peekRecord(ref) as User)];

      outcomeValues.forEach((item) => {
        if (seen.has(item)) {
          duplicates.add(item);
        } else {
          seen.add(item);
        }
      });

      outcome = Array.from(new Set(outcomeValues));

      break;
    case 'unshift': {
      error = "Cannot unshift duplicates to a hasMany's state.";
      const added = mutation.values.map((ref) => store.peekRecord(ref) as User);
      seen = new Set(friends);
      outcome = [];
      added.forEach((item) => {
        if (seen.has(item)) {
          duplicates.add(item);
        } else {
          seen.add(item);
          outcome.push(item);
        }
      });
      outcome.push(...friends);
      break;
    }
    case 'splice': {
      const start = mutation.start?.(record) ?? 0;
      const deleteCount = mutation.deleteCount?.(record) ?? 0;
      outcomeValues = friends.slice();
      const added = mutation.values.map((ref) => store.peekRecord(ref) as User);
      outcomeValues.splice(start, deleteCount, ...added);

      if (start === 0 && deleteCount === friends.length) {
        error = `Cannot replace a hasMany's state with a new state that contains duplicates.`;

        outcomeValues.forEach((item) => {
          if (seen.has(item)) {
            duplicates.add(item);
          } else {
            seen.add(item);
          }
        });

        outcome = Array.from(new Set(outcomeValues));
      } else {
        error = "Cannot splice a hasMany's state with a new state that contains duplicates.";

        const reducedFriends = friends.slice();
        reducedFriends.splice(start, deleteCount);
        seen = new Set(reducedFriends);
        const unique: User[] = [];

        added.forEach((item) => {
          if (seen.has(item)) {
            duplicates.add(item);
          } else {
            seen.add(item);
            unique.push(item);
          }
        });
        reducedFriends.splice(start, 0, ...unique);
        outcome = reducedFriends;
      }
      break;
    }
  }

  const hasDuplicates = duplicates.size > 0;
  return {
    hasDuplicates,
    duplicates: Array.from(duplicates),
    deduped: {
      length: outcome.length,
      membership: outcome,
      ids: outcome.map((v) => v.id),
    },
    unchanged: {
      length: friends.length,
      membership: friends.slice(),
      ids: friends.map((v) => v.id),
    },
    error,
  };
}

async function applyMutation(assert: Assert, store: Store, record: User, mutation: Mutation, rc: ReactiveContext) {
  assert.ok(true, `LOG: applying "${mutation.name}" with ids [${mutation.values.map((v) => v.id).join(',')}]`);

  const { counters, fieldOrder } = rc;
  const friendsIndex = fieldOrder.indexOf('friends');
  const initialFriendsCount = counters.friends;
  if (initialFriendsCount === undefined) {
    throw new Error('could not find counters.friends');
  }

  const result = generateAppliedMutation(store, record, mutation);
  const initialIds = record.friends.map((f) => f.id).join(',');

  const shouldError = result.hasDuplicates && !IS_DEPRECATE_MANY_ARRAY_DUPLICATES;
  const shouldDeprecate = result.hasDuplicates && IS_DEPRECATE_MANY_ARRAY_DUPLICATES;
  const expected = shouldError ? result.unchanged : result.deduped;

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
          mutation.start?.(record) ?? 0,
          mutation.deleteCount?.(record) ?? 0,
          ...mutation.values.map((ref) => store.peekRecord(ref) as User)
        );
        break;
    }
    assert.ok(!shouldError, `expected error ${shouldError ? '' : 'NOT '}to be thrown`);
    if (shouldDeprecate) {
      const expectedMessage = `${
        result.error
      } This behavior is deprecated. Found duplicates for the following records within the new state provided to \`<user:${
        record.id
      }>.friends\`\n\t- ${Array.from(result.duplicates)
        .map((r) => recordIdentifierFor(r).lid)
        .sort((a, b) => a.localeCompare(b))
        .join('\n\t- ')}`;
      assert.expectDeprecation({
        id: 'ember-data:deprecate-many-array-duplicates',
        until: '6.0',
        count: 1,
        message: expectedMessage,
      });
    }
  } catch (e) {
    assert.ok(shouldError, `expected error ${shouldError ? '' : 'NOT '}to be thrown`);
    const expectedMessage = shouldError
      ? `${result.error} Found duplicates for the following records within the new state provided to \`<user:${
          record.id
        }>.friends\`\n\t- ${Array.from(result.duplicates)
          .map((r) => recordIdentifierFor(r).lid)
          .sort((a, b) => a.localeCompare(b))
          .join('\n\t- ')}`
      : '';
    assert.strictEqual((e as Error).message, expectedMessage, `error thrown has correct message: ${expectedMessage}`);
  }

  const expectedIds = expected.ids.join(',');

  assert.strictEqual(
    record.friends.length,
    expected.length,
    `the new state has the correct length of ${expected.length} after ${mutation.method}`
  );
  assert.deepEqual(
    record.friends.slice(),
    expected.membership,
    `the new state has the correct records [${expectedIds}] after ${mutation.method} (had [${record.friends
      .map((f) => f.id)
      .join(',')}])`
  );
  assert.deepEqual(
    record.hasMany('friends').ids(),
    expected.ids,
    `the new state has the correct ids on the reference [${expectedIds}] after ${mutation.method}`
  );
  assert.strictEqual(
    record.hasMany('friends').ids().length,
    expected.length,
    `the new state has the correct length on the reference of ${expected.length} after ${mutation.method}`
  );
  assert.strictEqual(
    record.friends.length,
    new Set(record.friends).size,
    `the new state has no duplicates after ${mutation.method}`
  );

  await settled();

  const start = mutation.start?.(record) ?? 0;
  const deleteCount = mutation.deleteCount?.(record) ?? 0;
  const isReplace =
    mutation.method === 'splice' && (deleteCount > 0 || (start === 0 && deleteCount === record.friends.length));

  if (shouldError || (!isReplace && initialIds === expectedIds)) {
    assert.strictEqual(counters.friends, initialFriendsCount, 'reactivity: friendsCount does not increment');
  } else {
    assert.strictEqual(counters.friends, initialFriendsCount + 1, 'reactivity: friendsCount increments');
  }
  assert
    .dom(`li:nth-child(${friendsIndex + 1})`)
    .hasText(`friends: [${expectedIds}]`, 'reactivity: friends are rendered');
}

function getStartingState() {
  return [
    { name: 'empty friends', cb: (store: Store) => makeUser(store, []) },
    { name: '1 friend', cb: (store: Store) => makeUser(store, [krystanRef()]) },
    { name: '2 friends', cb: (store: Store) => makeUser(store, [krystanRef(), samRef()]) },
  ];
}

function getValues() {
  return [
    {
      name: 'with empty array',
      values: [],
    },
    {
      name: 'with NO duplicates (compared to initial remote state)',
      values: [ericRef()],
    },
    {
      name: 'with duplicates NOT present in initial remote state',
      values: [ericRef(), ericRef()],
    },
    {
      name: 'with duplicates present in initial remote state',
      values: [krystanRef()],
    },
    {
      name: 'with all the duplicates',
      values: [ericRef(), ericRef(), krystanRef()],
    },
  ];
}

function generateMutations(baseMutation: Omit<Mutation, 'values'>): Mutation[] {
  return getValues().map((v) => ({
    ...baseMutation,
    name: `${baseMutation.name} ${v.name}`,
    values: v.values,
  }));
}

function getMutations(): Mutation[] {
  return [
    ...generateMutations({
      name: 'push',
      method: 'push',
    }),
    ...generateMutations({
      name: 'unshift',
      method: 'unshift',
    }),
    ...generateMutations({
      name: 'replace',
      method: 'splice',
      start: () => 0,
      deleteCount: (user) => user.friends.length,
    }),
    ...generateMutations({
      name: 'splice with delete (to beginning)',
      method: 'splice',
      start: () => 0,
      deleteCount: (user) => (user.friends.length === 0 ? 0 : 1),
    }),
    ...generateMutations({
      name: 'splice (to beginning)',
      method: 'splice',
      start: () => 0,
      deleteCount: () => 0,
    }),
    ...generateMutations({
      name: 'splice (to middle)',
      method: 'splice',
      start: (user) => Math.floor(user.friends.length / 2),
      deleteCount: () => 0,
    }),
    ...generateMutations({
      name: 'splice (to end)',
      method: 'splice',
      start: (user) => user.friends.length,
      deleteCount: () => 0,
    }),
  ];
}

module('Integration | Relationships | Collection | Mutation', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
  });

  getStartingState().forEach((startingState) => {
    module(`Starting state: ${startingState.name}`, function () {
      getMutations().forEach((mutation) => {
        module(`Mutation: ${mutation.name}`, function () {
          getMutations().forEach((mutation2) => {
            test(`followed by Mutation: ${mutation2.name}`, async function (assert) {
              const store = this.owner.lookup('service:store') as Store;
              const user = startingState.cb(store);
              const rc = await unboundReactiveContext(this, user, [{ name: 'friends', type: 'hasMany' }]);
              rc.reset();

              await applyMutation(assert, store, user, mutation, rc);
              await applyMutation(assert, store, user, mutation2, rc);
            });
          });
        });
      });
    });
  });
});
