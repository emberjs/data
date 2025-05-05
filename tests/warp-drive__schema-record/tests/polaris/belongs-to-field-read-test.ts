import type { TestContext } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations, withDefaults } from '@warp-drive/schema-record';

type User = {
  id: string | null;
  $type: 'user';
  name: string;
  bestFriend: User | null;
  [Type]: 'user';
};

module('Reads | belongsTo in linksMode', function (hooks) {
  setupTest(hooks);

  test('we can use sync belongsTo in linksMode', function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
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

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.$type, 'user', 'bestFriend.user is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is accessible');
    assert.strictEqual(record.bestFriend?.bestFriend?.id, record.id, 'bestFriend is reciprocal');
  });

  test('we can update sync belongsTo in linksMode', function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
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

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '2', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Rey', 'bestFriend.name is accessible');

    store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
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
            name: 'Ray',
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

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend?.id, '3', 'bestFriend.id is accessible');
    assert.strictEqual(record.bestFriend?.name, 'Ray', 'bestFriend.name is accessible');
  });

  test('we error in linksMode if the relationship does not include a link', async function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
          },
        ],
      })
    );

    await assert.expectAssertion(
      () =>
        store.push<User>({
          data: {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Chris',
            },
            relationships: {
              bestFriend: {
                // oops we forgot links
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
        }),
      'Cannot fetch user.bestFriend because the field is in linksMode but the related link is missing'
    );
  });

  test('we error in linksMode if the relationship includes do not include a link', async function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
          },
        ],
      })
    );

    await assert.expectAssertion(
      () =>
        store.push<User>({
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
                  // oops we forgot links
                  data: { type: 'user', id: '1' },
                },
              },
            },
          ],
        }),
      'Cannot fetch user.bestFriend because the field is in linksMode but the related link is missing'
    );
  });

  test('we error in linksMode if the relationships are not included', async function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
          },
        ],
      })
    );

    await assert.expectAssertion(
      () =>
        store.push<User>({
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
          included: [],
        }),
      'Cannot fetch user.bestFriend because the field is in linksMode but the related data is not included'
    );
  });

  test('we error in linksMode if the relationship data is undefined', async function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
          },
        ],
      })
    );

    await assert.expectAssertion(
      () =>
        store.push<User>({
          data: {
            type: 'user',
            id: '1',
            attributes: {
              name: 'Chris',
            },
            relationships: {
              bestFriend: {
                links: { related: '/user/1/bestFriend' },
                // oops we forgot data
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
        }),
      'Cannot fetch user.bestFriend because the field is in linksMode but the relationship data is undefined'
    );
  });

  test('we do not error in linksMode if the relationship data is null', function (this: TestContext, assert) {
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
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: false, linksMode: true },
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
          bestFriend: {
            links: { related: '/user/1/bestFriend' },
            data: null,
          },
        },
      },
      included: [],
    });

    assert.strictEqual(record.id, '1', 'id is accessible');
    assert.strictEqual(record.$type, 'user', '$type is accessible');
    assert.strictEqual(record.name, 'Chris', 'name is accessible');
    assert.strictEqual(record.bestFriend, null, 'bestFriend is null');
  });

  test('we error for async belongsTo access in linksMode because we are not implemented yet', async function (this: TestContext, assert) {
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
          // @ts-expect-error not implemented yet
          {
            name: 'bestFriend',
            type: 'user',
            kind: 'belongsTo',
            options: { inverse: 'bestFriend', async: true, linksMode: true },
          },
        ],
      })
    );

    await assert.expectAssertion(
      () =>
        store.push<User>({
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
            // NOTE: If this is included, we can assume the link is pre-fetched
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
        }),
      'Cannot fetch user.bestFriend because the field is in linksMode but async is not yet supported'
    );
  });
});
