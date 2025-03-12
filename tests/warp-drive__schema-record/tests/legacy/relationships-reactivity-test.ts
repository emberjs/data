import { rerender } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import type { PromiseManyArray } from '@ember-data/model/-private';
import { PromiseBelongsTo } from '@ember-data/model/-private';
import {
  registerDerivations as registerLegacyDerivations,
  withDefaults as withLegacy,
} from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';

import type Store from 'warp-drive__schema-record/services/store';

import { reactiveContext } from '../-utils/reactive-context';

module('Legacy | Reactivity | relationships', function (hooks) {
  setupRenderingTest(hooks);

  test('sync belongsTo is reactive', async function (assert) {
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
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            bestFriend: {
              data: null,
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      bestFriend: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const bestFriendIndex = fieldOrder.indexOf('bestFriend');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.bestFriend, 1, 'bestFriendCount is 1');
    assert.strictEqual(Rey.bestFriend?.id, '2', 'id is accessible');
    assert.strictEqual(Rey.bestFriend?.name, 'Matt Seidel', 'name is accessible');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${bestFriendIndex + 1})`).hasText('bestFriend: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '3' },
          },
        },
      },
    });

    assert.strictEqual(Rey.bestFriend, Wes, 'Wes is now the bestFriend of Rey');
    assert.strictEqual(Wes.bestFriend, Rey, 'Rey is now the bestFriend of Wes');
    assert.strictEqual(Matt.bestFriend, null, 'Matt no longer has a bestFriend');
    assert.strictEqual(Rey.bestFriend?.id, '3', 'id is accessible');
    assert.strictEqual(Rey.bestFriend?.name, 'Wesley Thoburn', 'name is accessible');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.bestFriend, 2, 'bestFriendCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${bestFriendIndex + 1})`).hasText('bestFriend: Wesley Thoburn', 'name is rendered');
  });

  test('sync hasMany is reactive', async function (assert) {
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
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            friends: {
              data: [],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      friends: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const friendsIndex = fieldOrder.indexOf('friends');

    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(Wes.friends.length, 0, 'Wes has no friends :(');
    assert.strictEqual(Rey.friends[0], Matt, 'Rey has Matt as a friend');
    assert.strictEqual(Matt.friends[0], Rey, 'Matt has Rey as a friend');
    assert.strictEqual(Wes.friends[0], undefined, 'Wes truly has no friends');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 1, 'friendsCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          friends: {
            data: [{ type: 'user', id: '3' }],
          },
        },
      },
    });

    assert.strictEqual(Rey.friends.length, 1, 'Rey still has only one friend');
    assert.strictEqual(Matt.friends.length, 0, 'Matt now has no friends');
    assert.strictEqual(Wes.friends.length, 1, 'Wes now has one friend :)');
    assert.strictEqual(Rey.friends[0], Wes, 'Rey has Wes as a friend');
    assert.strictEqual(Wes.friends[0], Rey, 'Wes has Rey as a friend');
    assert.strictEqual(Matt.friends[0], undefined, 'Matt has no friends');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 2, 'friendsCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Wesley Thoburn', 'name is rendered');
  });

  test('sync hasMany responds to updates', async function (assert) {
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
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            friends: {
              data: [],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      friends: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const friendsIndex = fieldOrder.indexOf('friends');

    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(Wes.friends.length, 0, 'Wes has no friends :(');
    assert.strictEqual(Rey.friends[0], Matt, 'Rey has Matt as a friend');
    assert.strictEqual(Matt.friends[0], Rey, 'Matt has Rey as a friend');
    assert.strictEqual(Wes.friends[0], undefined, 'Wes truly has no friends');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 1, 'friendsCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          friends: {
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
            ],
          },
        },
      },
    });

    assert.strictEqual(Rey.friends.length, 2, 'Rey now has two friends');
    assert.strictEqual(Matt.friends.length, 1, 'Matt still has a friend');
    assert.strictEqual(Wes.friends.length, 1, 'Wes now has one friend :)');
    assert.strictEqual(Rey.friends[0], Matt, 'Rey still has Matt as a friend');
    assert.strictEqual(Rey.friends[1], Wes, 'Rey has Wes as a friend');
    assert.strictEqual(Wes.friends[0], Rey, 'Wes has Rey as a friend');
    assert.strictEqual(Matt.friends[0], Rey, 'Matt still has friends');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 2, 'friendsCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Matt Seidel, Wesley Thoburn', 'name is rendered');
  });

  test('async belongsTo is reactive', async function (assert) {
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
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            bestFriend: {
              data: null,
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      bestFriend: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const bestFriendIndex = fieldOrder.indexOf('bestFriend');

    const ReyBestFriend = await Rey.bestFriend;
    const MattBestFriend = await Matt.bestFriend;
    const WesBestFriend = await Wes.bestFriend;

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.bestFriend, 1, 'bestFriendCount is 1');
    assert.strictEqual(Rey.id, '1', 'id is accessible');
    assert.strictEqual(Rey.name, 'Rey Skybarker', 'name is accessible');
    assert.true(Rey.bestFriend instanceof PromiseBelongsTo, 'Rey has an async bestFriend');
    assert.true(Matt.bestFriend instanceof PromiseBelongsTo, 'Matt has an async bestFriend');
    assert.true(Wes.bestFriend instanceof PromiseBelongsTo, 'Wes has an async bestFriend');

    assert.strictEqual(ReyBestFriend, Matt, 'Rey has Matt as bestFriend');
    assert.strictEqual(MattBestFriend, Rey, 'Matt has Rey as bestFriend');
    assert.strictEqual(WesBestFriend, null, 'Wes has no bestFriend');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${bestFriendIndex + 1})`).hasText('bestFriend: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          bestFriend: {
            data: { type: 'user', id: '3' },
          },
        },
      },
    });

    const ReyBestFriend2 = await Rey.bestFriend;
    const MattBestFriend2 = await Matt.bestFriend;
    const WesBestFriend2 = await Wes.bestFriend;

    assert.strictEqual(ReyBestFriend2, Wes, 'Rey now has Wes as bestFriend');
    assert.strictEqual(MattBestFriend2, null, 'Matt now has no bestFriend');
    assert.strictEqual(WesBestFriend2, Rey, 'Wes is now the bestFriend of Rey');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.bestFriend, 2, 'bestFriendCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${bestFriendIndex + 1})`).hasText('bestFriend: Wesley Thoburn', 'name is rendered');
  });

  test('async hasMany is reactive', async function (assert) {
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
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            friends: {
              data: [],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      friends: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const friendsIndex = fieldOrder.indexOf('friends');

    const ReyFriends = await Rey.friends;
    const MattFriends = await Matt.friends;
    const WesFriends = await Wes.friends;

    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(Wes.friends.length, 0, 'Wes has no friends :(');
    assert.strictEqual(ReyFriends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(MattFriends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(WesFriends.length, 0, 'Wes has no friends');
    assert.strictEqual(ReyFriends[0], Matt, 'Rey has Matt as a friend');
    assert.strictEqual(MattFriends[0], Rey, 'Matt has Rey as a friend');
    assert.strictEqual(WesFriends[0], undefined, 'Rey really has no friends');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 1, 'friendsCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          friends: {
            data: [{ type: 'user', id: '3' }],
          },
        },
      },
    });

    assert.strictEqual(Rey.friends.length, 1, 'Rey still has only one friend');
    assert.strictEqual(Matt.friends.length, 0, 'Matt now has no friends');
    assert.strictEqual(Wes.friends.length, 1, 'Wes now has one friend :)');
    assert.strictEqual(ReyFriends[0], Wes, 'Rey has Wes as a friend');
    assert.strictEqual(WesFriends[0], Rey, 'Wes has Rey as a friend');
    assert.strictEqual(MattFriends[0], undefined, 'Matt has no friends');

    const ReyFriends2 = await Rey.friends;
    const MattFriends2 = await Matt.friends;
    const WesFriends2 = await Wes.friends;

    assert.strictEqual(Rey.friends.length, 1, 'Rey still has only one friend');
    assert.strictEqual(Matt.friends.length, 0, 'Matt now has no friends');
    assert.strictEqual(Wes.friends.length, 1, 'Wes now has one friend :)');
    assert.strictEqual(ReyFriends2[0], Wes, 'Rey has Wes as a friend');
    assert.strictEqual(WesFriends2[0], Rey, 'Wes has Rey as a friend');
    assert.strictEqual(MattFriends2[0], undefined, 'Matt has no friends');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 2, 'friendsCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Wesley Thoburn', 'name is rendered');
  });

  test('async hasMany responds to updates', async function (assert) {
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
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            friends: {
              data: [],
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      friends: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const friendsIndex = fieldOrder.indexOf('friends');

    const ReyFriends = await Rey.friends;
    const MattFriends = await Matt.friends;
    const WesFriends = await Wes.friends;

    assert.strictEqual(Rey.friends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(Matt.friends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(Wes.friends.length, 0, 'Wes has no friends :(');
    assert.strictEqual(ReyFriends.length, 1, 'Rey has only one friend :(');
    assert.strictEqual(MattFriends.length, 1, 'Matt has only one friend :(');
    assert.strictEqual(WesFriends.length, 0, 'Wes has no friends');
    assert.strictEqual(ReyFriends[0], Matt, 'Rey has Matt as a friend');
    assert.strictEqual(MattFriends[0], Rey, 'Matt has Rey as a friend');
    assert.strictEqual(WesFriends[0], undefined, 'Rey really has no friends');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 1, 'friendsCount is 1');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          friends: {
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
            ],
          },
        },
      },
    });

    assert.strictEqual(Rey.friends.length, 2, 'Rey now has two friends');
    assert.strictEqual(Matt.friends.length, 1, 'Matt still has friends');
    assert.strictEqual(Wes.friends.length, 1, 'Wes now has one friend :)');
    assert.strictEqual(ReyFriends[0], Matt, 'Rey has Matt as a friend');
    assert.strictEqual(ReyFriends[1], Wes, 'Rey has Wes as a friend');
    assert.strictEqual(WesFriends[0], Rey, 'Wes has Rey as a friend');
    assert.strictEqual(MattFriends[0], Rey, 'Matt has friends');

    const ReyFriends2 = await Rey.friends;
    const MattFriends2 = await Matt.friends;
    const WesFriends2 = await Wes.friends;

    assert.strictEqual(Rey.friends.length, 2, 'Rey now has 2 frienda');
    assert.strictEqual(Matt.friends.length, 1, 'Matt still has friends');
    assert.strictEqual(Wes.friends.length, 1, 'Wes now has one friend :)');
    assert.strictEqual(ReyFriends2[0], Matt, 'Rey has Matt as a friend');
    assert.strictEqual(ReyFriends2[1], Wes, 'Rey has Wes as a friend');
    assert.strictEqual(WesFriends2[0], Rey, 'Wes has Rey as a friend');
    assert.strictEqual(MattFriends2[0], Rey, 'Matt has friends');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.friends, 2, 'friendsCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${friendsIndex + 1})`).hasText('friends: Matt Seidel, Wesley Thoburn', 'name is rendered');
  });

  test('sync belongsTo in linksMode is reactive', async function (assert) {
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
            options: { async: false, inverse: 'bestFriend', linksMode: true },
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
            links: { related: '/user/1/bestFriend' },
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
              links: { related: '/user/2/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/3/bestFriend' },
              data: null,
            },
          },
        },
      ],
    });
    const Matt = store.peekRecord<User>('user', '2')!;
    const Wes = store.peekRecord<User>('user', '3')!;
    const resource = schema.resource({ type: 'user' });

    const { counters, fieldOrder } = await reactiveContext(Rey, resource, {
      bestFriend: 'name',
    });

    const nameIndex = fieldOrder.indexOf('name');
    const bestFriendIndex = fieldOrder.indexOf('bestFriend');

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.bestFriend, 1, 'bestFriendCount is 1');
    assert.strictEqual(Rey.bestFriend?.id, '2', 'id is accessible');
    assert.strictEqual(Rey.bestFriend?.name, 'Matt Seidel', 'name is accessible');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${bestFriendIndex + 1})`).hasText('bestFriend: Matt Seidel', 'name is rendered');

    // remote update
    store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: { type: 'user', id: '3' },
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Wesley Thoburn',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/3/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    assert.strictEqual(Rey.bestFriend, Wes, 'Wes is now the bestFriend of Rey');
    assert.strictEqual(Wes.bestFriend, Rey, 'Rey is now the bestFriend of Wes');
    assert.strictEqual(Matt.bestFriend, null, 'Matt no longer has a bestFriend');
    assert.strictEqual(Rey.bestFriend?.id, '3', 'id is accessible');
    assert.strictEqual(Rey.bestFriend?.name, 'Wesley Thoburn', 'name is accessible');

    await rerender();

    assert.strictEqual(counters.id, 1, 'idCount is 1');
    assert.strictEqual(counters.name, 1, 'nameCount is 1');
    assert.strictEqual(counters.bestFriend, 2, 'bestFriendCount is 2');

    assert.dom(`li:nth-child(${nameIndex + 1})`).hasText('name: Rey Skybarker', 'name is rendered');
    assert.dom(`li:nth-child(${bestFriendIndex + 1})`).hasText('bestFriend: Wesley Thoburn', 'name is rendered');
  });
});
