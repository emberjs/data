import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { PromiseBelongsTo, PromiseManyArray } from '@ember-data/model/-private';
import {
  registerDerivations as registerLegacyDerivations,
  withDefaults as withLegacy,
} from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';

import type Store from 'warp-drive__schema-record/services/store';

module('Legacy | Create | relationships', function (hooks) {
  setupTest(hooks);

  test('we can create with a belongsTo', function (assert) {
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
});
