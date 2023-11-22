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
  name: string;
  method: 'push' | 'unshift' | 'splice' | 'replace';
  values: ExistingResourceIdentifierObject[];
  start?: (record: User) => number;
  deleteCount?: (record: User) => number;
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
        mutation.start?.(record) ?? 0,
        mutation.deleteCount?.(record) ?? 0,
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
          mutation.start?.(record) ?? 0,
          mutation.deleteCount?.(record) ?? 0,
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

function getStartingState() {
  return [
    { name: 'empty friends', cb: (store: Store) => makeUser(store, []) },
    { name: '1 friend', cb: (store: Store) => makeUser(store, [krystanRef()]) },
    { name: '2 friends', cb: (store: Store) => makeUser(store, [krystanRef(), samRef()]) },
  ];
}

function getMutations() {
  return [
    {
      name: 'replace with NO duplicates',
      method: 'replace' as const,
      values: [samRef()],
    },
    {
      name: 'replace with duplicates NOT present in remote state',
      method: 'replace' as const,
      values: [samRef(), samRef()],
    },
    {
      name: 'replace with duplicates present in remote state',
      method: 'replace' as const,
      values: [samRef(), krystanRef()],
    },
    {
      name: 'push with NO duplicates',
      method: 'push' as const,
      values: [samRef()],
    },
    {
      name: 'push with duplicates NOT present in remote state',
      method: 'push' as const,
      values: [samRef(), samRef()],
    },
    {
      name: 'push with duplicates present in remote state (1)',
      method: 'push' as const,
      values: [krystanRef()],
    },
    {
      name: 'push with duplicates present in remote state',
      method: 'push' as const,
      values: [samRef(), krystanRef()],
    },
    {
      name: 'splice (to beginning) with NO duplicates',
      method: 'splice' as const,
      values: [samRef()],
      start: () => 0,
      deleteCount: () => 0,
    },
    {
      name: 'splice (to end) with NO duplicates',
      method: 'splice' as const,
      values: [samRef()],
      start: (user: User) => user.friends.length,
      deleteCount: () => 0,
    },
    {
      name: 'splice (to middle) with NO duplicates',
      method: 'splice' as const,
      values: [samRef()],
      start: (user: User) => Math.floor(user.friends.length / 2),
      deleteCount: () => 0,
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

  getStartingState().forEach((startingState) => {
    module(`Starting state: ${startingState.name}`, function () {
      getMutations().forEach((mutation) => {
        module(`Mutation: ${mutation.name}`, function () {
          getMutations().forEach((mutation2) => {
            test(`followed by Mutation: ${mutation2.name}`, function (assert) {
              const store = this.owner.lookup('service:store') as Store;
              const user = startingState.cb(store);
              applyMutation(assert, store, user, mutation);
              applyMutation(assert, store, user, mutation2);
            });
          });
        });
      });
    });
  });

  module('Unshifting new records', function () {});
});
