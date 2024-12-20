import type { TestContext } from '@ember/test-helpers';

import { module, skip, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record/schema';

type User = {
  id: string | null;
  $type: 'user';
  name: string;
  friends: User[] | null;
  [Type]: 'user';
};

module('Reads | hasMany in linksMode', function (hooks) {
  setupTest(hooks);

  test('we can use sync hasMany in linksMode', function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;

    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
          {
            name: 'friends',
            type: 'user',
            kind: 'hasMany',
            options: { inverse: 'friends', async: false, linksMode: true },
          },
        ],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          friends: {
            links: { related: '/user/1/friends' },
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
            ],
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
            friends: {
              links: { related: '/user/2/friends' },
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Jane',
          },
          relationships: {
            friends: {
              links: { related: '/user/3/friends' },
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.true(record.friends instanceof Array, 'Friends is an instance of Array');
    assert.true(Array.isArray(record.friends), 'Friends is an array');
    assert.strictEqual(record.friends?.length, 2, 'friends has 2 items');
    assert.strictEqual(record.friends?.[0].id, '2', 'friends[0].id is accessible');
    assert.strictEqual(record.friends?.[0].$type, 'user', 'friends[0].user is accessible');
    assert.strictEqual(record.friends?.[0].name, 'Rey', 'friends[0].name is accessible');
    assert.strictEqual(record.friends?.[0].friends?.[0].id, record.id, 'friends is reciprocal');
  });

  test('we can update sync hasMany in linksMode', function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;

    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'attribute',
          },
          {
            name: 'friends',
            type: 'user',
            kind: 'hasMany',
            options: { inverse: 'friends', async: false, linksMode: true },
          },
        ],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          friends: {
            links: { related: '/user/1/friends' },
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
            ],
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
            friends: {
              links: { related: '/user/2/friends' },
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Jane',
          },
          relationships: {
            friends: {
              links: { related: '/user/3/friends' },
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.friends?.length, 2, 'friends.length is accessible');
    assert.strictEqual(record.friends?.[0]?.id, '2', 'friends[0].id is accessible');
    assert.strictEqual(record.friends?.[0]?.name, 'Rey', 'friends[0].name is accessible');

    store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          friends: {
            links: { related: '/user/1/friends' },
            data: [{ type: 'user', id: '3' }],
          },
        },
      },
      included: [
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Jane',
          },
          relationships: {
            friends: {
              links: { related: '/user/3/friends' },
              data: [
                { type: 'user', id: '1' },
                { type: 'user', id: '2' },
              ],
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.friends?.length, 1, 'friends.length is accessible');
    assert.strictEqual(record.friends?.[0]?.id, '3', 'friends[0].id is accessible');
    assert.strictEqual(record.friends?.[0]?.name, 'Jane', 'friends[0].name is accessible');
    assert.strictEqual(record.friends?.[0]?.friends?.length, 2, 'friends[0].friends.length is accessible');
    assert.strictEqual(record.friends?.[0]?.friends?.[0].id, '1', 'friends[0].friends[0].id is accessible');
    assert.strictEqual(record.friends?.[0]?.friends?.[0].name, 'Chris', 'friends[0].friends[0].name is accessible');
  });

  skip('we error for async hasMany access in linksMode because we are not implemented yet', function (this: TestContext, assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;

    registerDerivations(schema);

    schema.registerResource(
      withDefaults({
        type: 'user',
        fields: [
          {
            name: 'name',
            kind: 'field',
          },
          {
            name: 'friends',
            type: 'user',
            kind: 'hasMany',
            options: { inverse: 'friends', async: true, linksMode: true },
          },
        ],
      })
    );

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          friends: {
            links: { related: '/user/1/friends' },
            data: [
              { type: 'user', id: '2' },
              { type: 'user', id: '3' },
            ],
          },
        },
      },
      included: [
        // NOTE: If this is included, we can assume the link is pre-fetched
        {
          type: 'user',
          id: '2',
          attributes: {
            name: 'Rey',
          },
          relationships: {
            friends: {
              links: { related: '/user/2/friends' },
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
        {
          type: 'user',
          id: '3',
          attributes: {
            name: 'Jane',
          },
          relationships: {
            friends: {
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      ],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');

    // assert.expectAssertion(
    //   () => record.friends,
    //   'Cannot fetch user.friends because the field is in linksMode but async is not yet supported'
    // );
  });
});
