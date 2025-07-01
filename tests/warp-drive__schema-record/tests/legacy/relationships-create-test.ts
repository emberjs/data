import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { AsyncHasMany } from '@ember-data/model';
import { PromiseBelongsTo, PromiseManyArray } from '@ember-data/model/-private';
import {
  registerDerivations as registerLegacyDerivations,
  withRestoredDeprecatedModelRequestBehaviors as withLegacy,
} from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';

import type Store from 'warp-drive__schema-record/services/store';

module('Legacy | Create | relationships', function (hooks) {
  setupTest(hooks);

  test('we can create with a belongsTo', function (assert) {
    type User = {
      id: string | null;
      name: string;
      bestFriend: User | null;
      friends: User[];
      [Type]: 'user';
    };
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
          {
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { async: false, inverse: 'bestFriend' },
          },
        ],
      })
    );
    const Matt = store.push<User>({
      data: {
        type: 'user',
        id: '2',
        attributes: {
          name: 'Matt Seidel',
        },
        relationships: {
          bestFriend: {
            data: null,
          },
        },
      },
    });

    const Rey = store.createRecord<User>('user', {
      name: 'Rey Skybarker',
      bestFriend: Matt,
    });

    assert.strictEqual(Rey.id, null, 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(Rey.bestFriend, Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(Matt.bestFriend, Rey, 'Matt has Rey as bestFriend');
  });

  test('we can create with a hasMany', function (assert) {
    type User = {
      id: string | null;
      $type: 'user';
      name: string;
      bestFriend: User | null;
      friends: User[];
      [Type]: 'user';
    };
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
          {
            name: 'friends',
            type: 'user',
            kind: 'hasMany',
            options: { async: false, inverse: 'friends' },
          },
        ],
      })
    );

    const Matt = store.push<User>({
      data: {
        type: 'user',
        id: '2',
        attributes: {
          name: 'Matt Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });

    const Rey = store.createRecord<User>('user', {
      name: 'Rey Skybarker',
      friends: [Matt],
    });

    assert.strictEqual(Rey.id, null, 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(Rey.friends[0], Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(Matt.friends[0], Rey, 'Matt has Rey as bestFriend');
  });

  test('we can create with an async belongsTo', async function (assert) {
    type User = {
      id: string | null;
      $type: 'user';
      name: string;
      bestFriend: Promise<User | null>;
      friends: AsyncHasMany<User>;
      [Type]: 'user';
    };
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
          {
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { async: true, inverse: 'bestFriend' },
          },
        ],
      })
    );

    const Matt = store.push<User>({
      data: {
        type: 'user',
        id: '2',
        attributes: {
          name: 'Matt Seidel',
        },
        relationships: {
          bestFriend: {
            data: null,
          },
        },
      },
    });

    const Rey = store.createRecord<User>('user', {
      name: 'Rey Skybarker',
      bestFriend: Matt,
    });

    assert.strictEqual(Rey.id, null, 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Rey.bestFriend instanceof PromiseBelongsTo, 'Rey has an async bestFriend');

    const ReyBestFriend = await Rey.bestFriend;
    assert.strictEqual(ReyBestFriend, Matt, 'Rey has Matt as bestFriend');

    const MattBestFriend = await Matt.bestFriend;
    assert.strictEqual(MattBestFriend, Rey, 'Matt has Rey as bestFriend');
  });

  test('we can create with an async hasMany', async function (assert) {
    type User = {
      id: string | null;
      name: string;
      bestFriend: Promise<User | null>;
      friends: AsyncHasMany<User>;
      [Type]: 'user';
    };
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerLegacyDerivations(schema);

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            type: null,
            kind: 'attribute',
          },
          {
            name: 'friends',
            type: 'user',
            kind: 'hasMany',
            options: { async: true, inverse: 'friends' },
          },
        ],
      })
    );

    const Matt = store.push<User>({
      data: {
        type: 'user',
        id: '2',
        attributes: {
          name: 'Matt Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });

    const Rey = store.createRecord<User>('user', {
      name: 'Rey Skybarker',
      friends: [Matt],
    });

    assert.strictEqual(Rey.id, null, 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Rey.friends instanceof PromiseManyArray, 'Rey has async friends');

    const ReyFriends = await Rey.friends;
    assert.strictEqual(ReyFriends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(ReyFriends[0], Matt, 'Rey has Matt as friend');

    const MattFriends = await Matt.friends;
    assert.strictEqual(MattFriends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(MattFriends[0], Rey, 'Matt has Rey as friend');
  });
});
