import { render } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupRenderingTest, setupTest } from 'ember-qunit';

import type Store from '@ember-data/store';
import type { Type } from '@warp-drive/core-types/symbols';
import { registerDerivations } from '@warp-drive/schema-record';

interface User {
  id: string | null;
  $type: 'user';
  name: string;
  age: number;
  netWorth: number;
  coolometer: number;
  rank: number;
  [Type]: 'user';
}

module('SchemaRecord | Iterable Behaviors', function (hooks) {
  setupTest(hooks);

  test('we can use `JSON.stringify` on a record without providing toJSON in the schema', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const serialized = JSON.stringify(record);
      assert.true(true, 'JSON.stringify should not throw');

      const value = JSON.parse(serialized) as object;
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'user',
          name: 'Rey Pupatine',
        },
        'stringify should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `JSON.stringify should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `{ ...record }` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const value = { ...record } as object;
      assert.true(true, 'spread should not throw');
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'user',
          name: 'Rey Pupatine',
        },
        'spread should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `spread should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (let key in record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const value = {} as Record<string, unknown>;

      for (const key in record) {
        value[key] = record[key as keyof User];
      }

      assert.true(true, 'for...in should not throw');
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'user',
          name: 'Rey Pupatine',
        },
        'for...in should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `for...in should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (const [key, value] of record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const value = {} as Record<string, unknown>;

      // @ts-expect-error we dont type the iterator
      for (const [key, val] of record) {
        value[key as string] = val;
      }

      assert.true(true, 'for...of should not throw');
      assert.deepEqual(
        value,
        {
          id: '1',
          $type: 'user',
          name: 'Rey Pupatine',
        },
        'for...of should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `for...of should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Object.keys(record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const keys = Object.keys(record);
      assert.true(true, 'Object.keys should not throw');
      assert.arrayStrictEquals(
        keys,
        ['id', '$type', 'name'],
        'Object.keys should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `Object.keys should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Object.value(record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const values = Object.values(record);
      assert.true(true, 'Object.values should not throw');
      assert.arrayStrictEquals(
        values,
        ['1', 'user', 'Rey Pupatine'],
        'Object.values should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `Object.values should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Object.entries(record)` on a record', function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    try {
      const entries = Object.entries(record);
      assert.true(true, 'Object.entries should not throw');
      assert.deepEqual(
        entries,
        [
          ['id', '1'],
          ['$type', 'user'],
          ['name', 'Rey Pupatine'],
        ],
        'Object.entries should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `Object.entries should not throw: ${(e as Error).message}`);
    }
  });
});

module('SchemaRecord | Iterable Behaviors | Rendering', function (hooks) {
  setupRenderingTest(hooks);

  test('we can use `{{#each-in record as |key value|}}` in a template', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });

    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    await render(
      <template>
        {{#each-in record as |key value|}}
          <div data-test-key={{key}}>{{value}}</div>
        {{/each-in}}
      </template>
    );

    assert.dom('[data-test-key="id"]').hasText('1');
    assert.dom('[data-test-key="$type"]').hasText('user');
    assert.dom('[data-test-key="name"]').hasText('Rey Pupatine');
  });

  test('we can use `{{#each record as |entry|}}` in a template', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { schema } = store;
    registerDerivations(schema);

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          type: '@constructor',
          name: 'constructor',
          kind: 'derived',
        },
        {
          type: '@identity',
          name: '$type',
          kind: 'derived',
          options: { key: 'type' },
        },
        {
          name: 'name',
          kind: 'field',
        },
      ],
    });

    const record = store.push<User & { [Symbol.iterator]: () => Iterator<[string, string]> }>({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'Rey Pupatine' },
      },
    });

    const get = (entry: [string, string], index: number) => entry[index];

    await render(
      <template>
        {{#each record as |entry|}}
          <div data-test-key={{get entry 0}}>{{get entry 1}}</div>
        {{/each}}
      </template>
    );

    assert.dom('[data-test-key="id"]').hasText('1');
    assert.dom('[data-test-key="$type"]').hasText('user');
    assert.dom('[data-test-key="name"]').hasText('Rey Pupatine');
  });
});
