import type { TestContext } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { Checkout, registerDerivations, withDefaults } from '@warp-drive/schema-record';

type User = {
  id: string | null;
  $type: 'user';
  name: string;
  friends: User[] | null;
  [Type]: 'user';
  [Checkout]: () => Promise<User>;
};

module('Mutate | hasMany in linksMode', function (hooks) {
  setupTest(hooks);

  test('we can mutate a sync hasMany in linksMode', async function (this: TestContext, assert) {
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
          name: 'Leo',
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
            name: 'Benedikt',
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
    const [record4, record5, record6] = store.push<User>({
      data: [
        {
          type: 'user',
          id: '4',
          attributes: {
            name: 'William',
          },
          relationships: {
            friends: {
              links: { related: '/user/4/friends' },
              data: [],
            },
          },
        },
        {
          type: 'user',
          id: '5',
          attributes: {
            name: 'Thomas',
          },
          relationships: {
            friends: {
              links: { related: '/user/5/friends' },
              data: [],
            },
          },
        },
        {
          type: 'user',
          id: '6',
          attributes: {
            name: 'Matthew',
          },
          relationships: {
            friends: {
              links: { related: '/user/6/friends' },
              data: [],
            },
          },
        },
      ],
    });

    // remote state should not show mutated state
    const assertRemoteState = () => {
      assert.strictEqual(record.friends?.length, 2, 'friends has 2 items');
      assert.arrayStrictEquals(
        record.friends?.map((friend) => friend.id),
        ['2', '3'],
        'friends are correct'
      );
    };

    assertRemoteState();
    const editable = await record[Checkout]();

    // we should have a separate ManyArray reference
    assert.true(editable.friends !== record.friends, 'editable.friends is a different reference than record.friends');

    // Mutate the hasMany relationship

    // push a new record
    editable.friends?.push(record4);
    assert.strictEqual(editable.friends?.length, 3, 'friends has 3 items');
    assert.strictEqual(editable.friends?.[2].id, '4', 'friends[2].id is accessible');
    assert.arrayStrictEquals(
      editable.friends?.map((friend) => friend.id),
      ['2', '3', '4'],
      'friends are correct'
    );
    assertRemoteState();

    // unshift a new record
    editable.friends?.unshift(record6);
    assert.strictEqual(editable.friends?.length, 4, 'friends has 4 items');
    assert.strictEqual(editable.friends?.[0].id, '6', 'friends[0].id is accessible');
    assert.arrayStrictEquals(
      editable.friends?.map((friend) => friend.id),
      ['6', '2', '3', '4'],
      'friends are correct'
    );
    assertRemoteState();

    // splice in a new record
    editable.friends?.splice(1, 0, record5);
    assert.strictEqual(editable.friends?.length, 5, 'friends has 5 items');
    assert.strictEqual(editable.friends?.[1].id, '5', 'friends[1].id is accessible');
    assert.arrayStrictEquals(
      editable.friends?.map((friend) => friend.id),
      ['6', '5', '2', '3', '4'],
      'friends are correct'
    );
    assertRemoteState();
  });
});
