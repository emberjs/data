import type { StableRecordIdentifier } from '@warp-drive/core';
import { type Diagnostic } from '@warp-drive/diagnostic';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { CollectionResourceDocument, SingleResourceDocument } from '@ember-data/store/-types/q/ember-data-json-api';

import type { Context, UserRecord } from './setup';
import { stateOf } from './setup';

export interface TestConfig {
  /**
   * name for the test
   */
  name: string;
  /**
   * whether the relationships should be async
   */
  async: boolean;
  /**
   * whether the relationships should use inverse: null
   * which causes each side to have an implicit inverse
   */
  inverseNull: boolean;
  /**
   * whether the relationships should be belongsTo (1:1)
   * or hasMany (many:many) in configuration.
   */
  relType: 'hasMany' | 'belongsTo';
  /**
   * By default both chris and john will be in a clean fully canonical
   * state to start (default `false`).
   *
   * `true` will cause `john` to be created client side instead,
   * which is useful for testing the outcome of `isNew` on relationship
   * removal.
   */
  useCreate?: boolean;
  /**
   * By default both chris and john will be in a clean fully canonical
   * state to start (default `false`).
   *
   * `true` will cause `john` to be added locally to `chris` and,
   * `chris` to be added locally to `john`. E.g. both will have an
   * empty remote state and a populated local state.
   */
  dirtyLocal?: boolean;
  /**
   * `unloadRecord` has some special semantics to account for on a clean record
   */
  isUnloadAsDelete?: boolean;
}

interface ExpectedTestOutcomes {
  // whether the test expects `john` to have been removed from relationships
  removed: boolean;
  // whether the test expects the relationship cache for `john` to have been cleared
  cleared: boolean;
  // whether the test expects the implicit relationship cache for `john` to have been cleared, defaults to `cleared`
  implicitCleared?: boolean;
}

/**
 * Setup state and run initial assertions that are true for
 * all tests in the group.
 */
interface TestState {
  chris: UserRecord;
  john: UserRecord;
  chrisIdentifier: StableRecordIdentifier;
  johnIdentifier: StableRecordIdentifier;
  chrisInverseKey: string;
  johnInverseKey: string;
}

type UserRef = { type: 'user'; id: string };
type BestFriendRel<T> = {
  bestFriends: {
    data: T;
  };
};

function makeRel(id: string | null, isMany: false): BestFriendRel<UserRef | null>;
function makeRel(id: string | null, isMany: true): BestFriendRel<UserRef[]>;
function makeRel(id: string | null, isMany: boolean): BestFriendRel<UserRef | UserRef[] | null> {
  let ref = { type: 'user', id: id as string } as const;
  const data = isMany ? (id === null ? [] : [ref]) : id === null ? null : ref;

  return { bestFriends: { data } };
}

export async function setInitialState(context: Context, config: TestConfig, assert: Diagnostic): Promise<TestState> {
  const { owner, store, graph } = context;
  const { identifierCache } = store;
  const isMany = config.relType === 'hasMany';

  const relFn = isMany ? hasMany : belongsTo;
  const relConfig = {
    async: config.async,
    inverse: config.inverseNull ? null : 'bestFriends',
  };

  class User extends Model {
    @attr name;
    @relFn('user', relConfig) bestFriends;
  }
  owner.register('model:user', User);

  let chris: UserRecord, john: UserRecord, johnIdentifier: StableRecordIdentifier;
  if (!config.useCreate) {
    const data: CollectionResourceDocument = {
      data: [
        {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
          relationships: makeRel(config.dirtyLocal ? null : '2', isMany as true),
        },
        {
          type: 'user',
          id: '2',
          attributes: { name: 'John' },
          relationships: makeRel(config.dirtyLocal ? null : '1', isMany as true),
        },
      ],
    };

    [chris, john] = store.push(data);
    johnIdentifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
  } else {
    chris = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Chris' },
      },
    } as SingleResourceDocument);
    john = store.createRecord('user', { name: 'John', bestFriends: isMany ? [chris] : chris }) as UserRecord;
    johnIdentifier = recordIdentifierFor(john);
  }

  if (config.dirtyLocal) {
    if (isMany) {
      let friends: UserRecord[] = await (john.bestFriends as unknown as Promise<UserRecord[]>);
      friends.push(chris);
      friends = await (chris.bestFriends as unknown as Promise<UserRecord[]>);
      friends.push(john);
    } else {
      // @ts-expect-error
      john.bestFriends = chris;
      // @ts-expect-error
      chris.bestFriends = john;
    }
  }

  // give ourselves a tick in case there was async work
  await Promise.resolve();

  const chrisIdentifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
  const chrisBestFriend = graph.get(chrisIdentifier, 'bestFriends');
  const johnBestFriend = graph.get(johnIdentifier, 'bestFriends');

  // pre-conds
  assert.equal(chris.name, 'Chris', 'PreCond: We have chris');
  assert.equal(john.name, 'John', 'PreCond: We have john');
  assert.false(chris.isDeleted, 'PreCond: Chris is not deleted');
  assert.false(john.isDeleted, 'PreCond: John is not deleted');

  const chrisState = stateOf(store._graph!, chrisBestFriend);
  const johnState = stateOf(store._graph!, johnBestFriend);

  assert.deepEqual(
    chrisState.remote,
    config.dirtyLocal || config.useCreate ? [] : [johnIdentifier],
    config.dirtyLocal || config.useCreate
      ? 'PreCond: Chris has no best friend (remote)'
      : 'PreCond: Chris has John as a best friend (remote)'
  );
  assert.deepEqual(
    chrisState.local,
    config.useCreate && config.inverseNull ? [] : [johnIdentifier],
    config.useCreate && config.inverseNull
      ? 'PreCond: Chris has no best friend (local)'
      : 'PreCond: Chris has John as a best friend (local)'
  );
  assert.deepEqual(
    johnState.remote,
    config.dirtyLocal || config.useCreate ? [] : [chrisIdentifier],
    config.dirtyLocal || config.useCreate
      ? 'PreCond: John has no best friend (remote)'
      : 'PreCond: John has Chris as a best friend (remote)'
  );
  assert.deepEqual(johnState.local, [chrisIdentifier], 'PreCond: John has Chris as a best friend (local)');

  if (config.inverseNull) {
    const chrisImplicits = graph.getImplicit(chrisIdentifier);
    const johnImplicits = graph.getImplicit(johnIdentifier);

    assert.equal(Object.keys(chrisImplicits).length, 1, 'PreCond: Chris has one implicit relationship');

    const chrisImplicitFriend = chrisImplicits[chrisBestFriend.definition.inverseKey];
    const johnImplicitFriend = johnImplicits[johnBestFriend.definition.inverseKey];

    assert.ok(chrisImplicitFriend, 'PreCond: Chris has an implicit best friend');

    const chrisImplicitState = stateOf(store._graph!, chrisImplicitFriend);

    assert.deepEqual(
      chrisImplicitState.remote,
      config.dirtyLocal || config.useCreate ? [] : [johnIdentifier],
      config.dirtyLocal || config.useCreate
        ? 'PreCond: Chris has no implicit best friend (remote)'
        : 'PreCond: Chris has John as an implicit best friend (remote)'
    );
    assert.deepEqual(
      chrisImplicitState.local,
      [johnIdentifier],
      'PreCond: Chris has John as an implicit best friend (local)'
    );

    // implicits on john are managed by chris, so with inverseNull
    // the implicit on john will be empty since chris should have no state.
    if (config.useCreate) {
      assert.equal(Object.keys(johnImplicits).length, 0, 'PreCond: John has no implicit relationship');
      assert.notOk(johnImplicitFriend, 'PreCond: John has no implicit best friend');
    } else {
      assert.equal(Object.keys(johnImplicits).length, 1, 'PreCond: John has one implicit relationship');
      assert.ok(johnImplicitFriend, 'PreCond: John has no implicit best friend');
      const johnImplicitState = stateOf(store._graph!, johnImplicitFriend);
      assert.deepEqual(
        johnImplicitState.remote,
        config.dirtyLocal || config.useCreate ? [] : [chrisIdentifier],
        config.dirtyLocal || config.useCreate
          ? 'PreCond: John has no implicit best friend (remote)'
          : 'PreCond: John has Chris as an implicit best friend (remote)'
      );
      assert.deepEqual(
        johnImplicitState.local,
        config.useCreate ? [] : [chrisIdentifier],
        config.useCreate
          ? 'PreCond: John has no implicit best friend (local)'
          : 'PreCond: John has Chris as an implicit best friend (local)'
      );
    }
  } else {
    assert.false(graph.implicit.has(chrisIdentifier), 'PreCond: no implicits for chris');
    assert.false(graph.implicit.has(johnIdentifier), 'PreCond: no implicits for john');
  }

  return {
    chris,
    john,
    chrisIdentifier,
    johnIdentifier,
    chrisInverseKey: chrisBestFriend.definition.inverseKey,
    johnInverseKey: johnBestFriend.definition.inverseKey,
  };
}

export function testFinalState(
  context: Context,
  testState: TestState,
  config: TestConfig,
  statuses: ExpectedTestOutcomes,
  assert: Diagnostic
) {
  const { graph, store } = context;
  const { chrisIdentifier, johnIdentifier } = testState;

  const chrisBestFriend = graph.get(chrisIdentifier, 'bestFriends');
  const chrisState = stateOf(store._graph!, chrisBestFriend);

  // this specific case gets it's own WAT
  // this is something ideally a refactor should do away with.
  const isUnloadOfImplictAsyncHasManyWithLocalChange =
    !!config.isUnloadAsDelete &&
    !!config.dirtyLocal &&
    !!config.async &&
    config.relType === 'hasMany' &&
    !!config.inverseNull;

  // a second WAT likely related to the first, persisted delete w/o unload of
  // a sync hasMany with local changes is not cleared. This WAT is handled
  // within the abstract-edge-removal-test configuration.

  // in the dirtyLocal and useCreate case there is no remote data
  const chrisRemoteRemoved = config.dirtyLocal || config.useCreate || statuses.removed;
  const chrisLocalRemoved = statuses.removed && !isUnloadOfImplictAsyncHasManyWithLocalChange;

  // for the isUnloadAsDelete case we don't remove unless dirtyLocal or useCreate
  // this may be a bug but likely is related to retaining info for rematerialization.
  // as the RecordData is in an empty state but not destroyed.
  const johnRemoteRemoved = config.dirtyLocal || config.useCreate || (!config.isUnloadAsDelete && statuses.removed);
  const johnLocalRemoved = !config.isUnloadAsDelete && statuses.removed;
  const johnCleared = statuses.cleared;

  const _removed = config.isUnloadAsDelete ? statuses.cleared && statuses.removed : statuses.removed;
  // in the dirtyLocal and useCreate case there is no remote data
  const chrisImplicitRemoteRemoved = config.dirtyLocal || config.useCreate || _removed;
  const chrisImplicitLocalRemoved = _removed;
  const johnImplicitsCleared = statuses.implicitCleared || statuses.cleared;
  // in the dirtyLocal and useCreate case there is no remote data
  const johnImplicitRemoteRemoved = config.dirtyLocal || config.useCreate || statuses.removed;
  const johnImplicitLocalRemoved = statuses.removed;

  const OUTCOMES = {
    chrisRemoteRemoved,
    chrisLocalRemoved,
    johnCleared,
    johnRemoteRemoved,
    johnLocalRemoved,
    chrisImplicitRemoteRemoved,
    chrisImplicitLocalRemoved,
    johnImplicitsCleared,
    johnImplicitRemoteRemoved,
    johnImplicitLocalRemoved,
  };

  assert.deepEqual(
    chrisState.remote,
    OUTCOMES.chrisRemoteRemoved ? [] : [johnIdentifier],
    OUTCOMES.chrisRemoteRemoved
      ? 'Result: Chris has no best friend (remote)'
      : 'Result: Chris has John as a best friend (remote)'
  );
  assert.deepEqual(
    chrisState.local,
    OUTCOMES.chrisLocalRemoved ? [] : [johnIdentifier],
    OUTCOMES.chrisLocalRemoved
      ? 'Result: Chris has no best friend (local)'
      : 'Result: Chris has John as a best friend (local)'
  );

  if (OUTCOMES.johnCleared) {
    assert.false(graph.identifiers.has(johnIdentifier), 'Result: Relationships for John were cleared from the cache');
  } else {
    const johnBestFriend = graph.get(johnIdentifier, 'bestFriends');
    const johnState = stateOf(store._graph!, johnBestFriend);

    assert.deepEqual(
      johnState.remote,
      OUTCOMES.johnRemoteRemoved ? [] : [chrisIdentifier],
      OUTCOMES.johnRemoteRemoved
        ? 'Result: John has no best friend (remote)'
        : 'Result: John has Chris as a best friend (remote)'
    );
    assert.deepEqual(
      johnState.local,
      OUTCOMES.johnLocalRemoved ? [] : [chrisIdentifier],
      OUTCOMES.johnLocalRemoved
        ? 'Result: John has no best friend (local)'
        : 'Result: John has Chris as a best friend (local)'
    );
  }

  if (config.inverseNull) {
    const chrisImplicits = graph.getImplicit(chrisIdentifier);

    assert.equal(Object.keys(chrisImplicits).length, 1, 'Result: Chris has one implicit relationship key');

    const chrisImplicitFriend = chrisImplicits[testState.chrisInverseKey];

    assert.ok(chrisImplicitFriend, 'Result: Chris has an implicit relationship for best friend');
    const chrisImplicitState = stateOf(store._graph!, chrisImplicitFriend);

    assert.deepEqual(
      chrisImplicitState.remote,
      OUTCOMES.chrisImplicitRemoteRemoved ? [] : [johnIdentifier],
      OUTCOMES.chrisImplicitRemoteRemoved
        ? 'Result: Chris has no implicit best friend (remote)'
        : 'Result: John implicitly has Chris as a best friend (remote)'
    );
    assert.deepEqual(
      chrisImplicitState.local,
      OUTCOMES.chrisImplicitLocalRemoved ? [] : [johnIdentifier],
      OUTCOMES.chrisImplicitLocalRemoved
        ? 'Result: Chris has no implicit best friend (local)'
        : 'Result: John implicitly has Chris as a best friend (local)'
    );

    if (OUTCOMES.johnImplicitsCleared) {
      assert.false(graph.implicit.has(johnIdentifier), 'implicit cache for john has been removed');
    } else {
      const johnImplicits = graph.getImplicit(johnIdentifier);
      const johnImplicitFriend = johnImplicits[testState.johnInverseKey];
      assert.equal(Object.keys(johnImplicits).length, 1, 'Result: John has one implicit relationship in the cache');
      assert.ok(johnImplicitFriend, 'Result: John has an implicit key for best friend');
      const johnImplicitState = stateOf(store._graph!, johnImplicitFriend);

      assert.deepEqual(
        johnImplicitState.remote,
        OUTCOMES.johnImplicitRemoteRemoved ? [] : [chrisIdentifier],
        OUTCOMES.johnImplicitRemoteRemoved
          ? 'Result: John has no implicit best friend (remote)'
          : 'Result: Chris implicitly has John as a best friend (remote)'
      );
      assert.deepEqual(
        johnImplicitState.local,
        OUTCOMES.johnImplicitLocalRemoved ? [] : [chrisIdentifier],
        OUTCOMES.johnImplicitLocalRemoved
          ? 'Result: John has no implicit best friend (local)'
          : 'Result: Chris implicitly has John as a best friend (local)'
      );
    }
  } else {
    assert.false(graph.implicit.has(chrisIdentifier), 'Result: no implicits for chris');
    assert.false(graph.implicit.has(johnIdentifier), 'Result: no implicits for john');
  }
}
