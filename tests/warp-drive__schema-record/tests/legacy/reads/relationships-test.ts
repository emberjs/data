import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { PromiseBelongsTo, PromiseManyArray } from '@ember-data/model/-private';
import {
  registerDerivations as registerLegacyDerivations,
  withDefaults as withLegacy,
} from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';

import type Store from 'warp-drive__schema-record/services/store';

module('Legacy | Reads | relationships', function (hooks) {
  setupTest(hooks);

  test('we can use sync belongsTo', function (assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { async: false, inverse: 'bestFriend' },
          },
        ],
      })
    );

    const Rey = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
        },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Matt Seidel',
          },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;

    assert.strictEqual(Rey.id, '1', 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(Rey.bestFriend, Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(Matt.bestFriend, Rey, 'Matt has Rey as bestFriend');
  });

  test('we can use sync hasMany', function (assert) {
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

    const Rey = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
        },
        relationships: {
          friends: {
            data: [{ type: 'user', id: '2' }],
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Matt Seidel',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;

    assert.strictEqual(Rey.id, '1', 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(Rey.friends[0], Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(Matt.friends[0], Rey, 'Matt has Rey as bestFriend');
  });

  test('we can use async belongsTo', async function (assert) {
    type User = {
      id: string;
      name: string;
      bestFriend: PromiseBelongsTo<User | null>;
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

    const Rey = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
        },
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '2' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Matt Seidel',
          },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;

    const ReyBestFriend = await Rey.bestFriend;
    const MattBestFriend = await Matt.bestFriend;

    assert.strictEqual(Rey.id, '1', 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Rey.bestFriend instanceof PromiseBelongsTo, 'Rey has an async bestFriend');
    assert.true(Matt.bestFriend instanceof PromiseBelongsTo, 'Matt has an async bestFriend');

    assert.strictEqual(ReyBestFriend, Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(MattBestFriend, Rey, 'Matt has Rey as bestFriend');
  });

  test('we can use async hasMany', async function (assert) {
    type User = {
      id: string;
      name: string;
      friends: PromiseManyArray<User>;
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

    const Rey = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Rey Skybarker',
        },
        relationships: {
          friends: {
            data: [{ type: 'user', id: '2' }],
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Matt Seidel',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;

    const ReyFriends = await Rey.friends;
    const MattFriends = await Matt.friends;

    assert.strictEqual(Rey.id, '1', 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');

    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.true(Rey.friends instanceof PromiseManyArray, 'Rey has an async bestFriend');
    assert.true(Matt.friends instanceof PromiseManyArray, 'Matt has an async bestFriend');

    assert.strictEqual(ReyFriends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(MattFriends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(ReyFriends[0], Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(MattFriends[0], Rey, 'Matt has Rey as bestFriend');
  });
});
