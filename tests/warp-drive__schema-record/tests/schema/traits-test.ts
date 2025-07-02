import type { TestContext } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import type { Store } from '@warp-drive/core';
import { registerDerivations, withDefaults } from '@warp-drive/core/reactive';

module('SchemaService | Traits', function (hooks) {
  setupTest(hooks);

  test('We can register and use a trait', function (this: TestContext, assert) {
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
        ],
        traits: ['timestamped'],
      })
    );
    schema.registerTrait!({
      name: 'timestamped',
      mode: 'polaris' as const,
      fields: [
        {
          name: 'createdAt',
          kind: 'field',
        },
        {
          name: 'deletedAt',
          kind: 'field',
        },
      ],
    });

    const fields = schema.fields({ type: 'user' });
    assert.deepEqual(
      fields.get('name'),
      {
        name: 'name',
        kind: 'field',
      },
      'name field exists'
    );
    assert.deepEqual(
      fields.get('createdAt'),
      {
        name: 'createdAt',
        kind: 'field',
      },
      'createdAt field exists'
    );
    assert.deepEqual(
      fields.get('deletedAt'),
      {
        name: 'deletedAt',
        kind: 'field',
      },
      'deletedAt field exists'
    );
  });

  test('Traits may have traits', function (this: TestContext, assert) {
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
        ],
        traits: ['timestamped'],
      })
    );
    schema.registerTrait!({
      name: 'timestamped',
      mode: 'polaris' as const,
      fields: [
        {
          name: 'createdAt',
          kind: 'field',
        },
      ],
      traits: ['deleteable'],
    });
    schema.registerTrait!({
      name: 'deleteable',
      mode: 'polaris' as const,
      fields: [
        {
          name: 'deletedAt',
          kind: 'field',
        },
      ],
    });

    const fields = schema.fields({ type: 'user' });
    assert.deepEqual(
      fields.get('name'),
      {
        name: 'name',
        kind: 'field',
      },
      'name field exists'
    );
    assert.deepEqual(
      fields.get('createdAt'),
      {
        name: 'createdAt',
        kind: 'field',
      },
      'createdAt field exists'
    );
    assert.deepEqual(
      fields.get('deletedAt'),
      {
        name: 'deletedAt',
        kind: 'field',
      },
      'deletedAt field exists'
    );
  });
});
