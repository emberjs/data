import type { TestContext } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { PromiseBelongsTo, PromiseManyArray } from '@ember-data/model/-private';
import {
  registerDerivations as registerLegacyDerivations,
  withDefaults as withLegacy,
  type WithLegacyDerivations,
} from '@ember-data/model/migration-support';
import type { Handler, NextFn } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import type Store from '@ember-data/store';
import { CacheHandler } from '@ember-data/store';
import type { RequestContext } from '@warp-drive/core-types/request';
import type { Type } from '@warp-drive/core-types/symbols';

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

  test('we can reload sync belongsTo in linksMode', async function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;

    registerLegacyDerivations(schema);

    type LegacyUser = WithLegacyDerivations<{
      [Type]: 'user';
      id: string;
      name: string;
      bestFriend: LegacyUser | null;
    }>;

    schema.registerResource(
      withLegacy({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'attribute',
          },
          {
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
          },
        ],
      })
    );

    const record = store.push<LegacyUser>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
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
            name: 'Rey',
          },
          relationships: {
            bestFriend: {
              links: { related: '/user/2/bestFriend' },
              data: { type: 'user', id: '1' },
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is correct');
    assert.strictEqual(record.name, 'Chris', 'name is correct');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is correct');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is correct');

    const manager = new RequestManager();
    const handler: Handler = {
      request<T>(context: RequestContext, next: NextFn<T>): Promise<T> {
        assert.step(`op=${context.request.op ?? 'UNKNOWN OP CODE'}, url=${context.request.url ?? 'UNKNOWN URL'}`);
        return Promise.resolve({
          data: {
            type: 'user',
            id: '3',
            attributes: {
              name: 'Ray',
            },
            relationships: {
              bestFriend: {
                links: { related: '/user/3/bestFriend' },
                data: { type: 'user', id: '1' },
              },
            },
          },
        } as T);
      },
    };
    manager.use([handler]);
    manager.useCache(CacheHandler);
    store.requestManager = manager;

    await record.belongsTo('bestFriend').reload();

    assert.verifySteps(['op=findBelongsTo, url=/user/1/bestFriend'], 'op and url are correct');

    assert.strictEqual(record.id, '1', 'id is correct');
    assert.strictEqual(record.name, 'Chris', 'name is correct');
    assert.strictEqual(record.bestFriend?.id, '3', 'bestFriend.id is correct');
    assert.strictEqual(record.bestFriend?.name, 'Ray', 'bestFriend.name is correct');
  });
});
