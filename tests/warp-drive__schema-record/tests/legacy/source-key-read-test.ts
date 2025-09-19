import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import {
  registerDerivations as registerLegacyDerivations,
  withRestoredDeprecatedModelRequestBehaviors as withLegacy,
} from '@ember-data/model/migration-support';
import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';

module('Legacy | Reads | SourceKey', function (hooks) {
  setupTest(hooks);

  test('belongsTo can use sourceKey', function (assert) {
    type User = {
      id: string | null;
      $type: 'user';
      name: string;
      bestFriend: User | null;
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
            sourceKey: 'best-friend',
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
          'best-friend': {
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
            'best-friend': {
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

  test('hasMany can use sourceKey', function (assert) {
    type User = {
      id: string | null;
      $type: 'user';
      name: string;
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
            sourceKey: 'best-friends',
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
          'best-friends': {
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
            'best-friends': {
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
});
